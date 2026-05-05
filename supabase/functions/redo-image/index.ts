// supabase/functions/redo-image/index.ts
// Revises a single prompt via Gemini, then runs Flux-1-dev → PiAPI face swap
// (same pipeline as generate-images). Inserts a new row with is_redo=true.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE  = 'https://api.piapi.ai/api/v1/task'
const PIAPI_FETCH = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`

const NEGATIVE_PROMPT =
  'multiple people, crowd, group, second face, background person, stock photo, amateur photography, flat lighting, overexposed, underexposed, blurry, low quality, grainy, washed out colors, boring composition, generic, cliché, distorted face, extra limbs, watermark, text overlay, cartoon, illustration, drawing'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth:   { persistSession: false },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // ── Input ─────────────────────────────────────────────────────────────────
    const { generation_id, feedback } = await req.json()
    if (!generation_id || !feedback?.trim()) {
      return json({ error: 'generation_id and feedback are required' }, 400)
    }

    // ── Fetch generation + parent project ─────────────────────────────────────
    const { data: gen, error: genError } = await supabase
      .from('media_generations')
      .select('id, prompt_text, revision_count, vision_project_id, order_num, affirmation')
      .eq('id', generation_id)
      .single()

    if (genError || !gen) return json({ error: 'Generation not found' }, 404)
    if (gen.revision_count >= 1) return json({ error: 'Revision limit reached' }, 400)

    // Verify project ownership
    const { data: project } = await supabase
      .from('vision_projects')
      .select('user_id, selfie_url')
      .eq('id', gen.vision_project_id)
      .eq('user_id', user.id)
      .single()

    if (!project) return json({ error: 'Project not found or access denied' }, 403)
    if (!project.selfie_url) return json({ error: 'No selfie_url on project' }, 400)

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    // ── Revise both prompts via Gemini ────────────────────────────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY')!
    const { imagePrompt: revisedPrompt, videoPrompt: revisedVideoPrompt } =
      await revisePrompts(geminiKey, gen.prompt_text, feedback)
    console.log(`Revised prompt for gen ${generation_id}: ${revisedPrompt.slice(0, 80)}...`)

    // ── Step 1: Flux-1-dev text-to-image ─────────────────────────────────────
    const rawImageUrl = await generateFluxImage(piApiKey, revisedPrompt)
    console.log(`Flux image ready: ${rawImageUrl}`)

    // ── Step 2: Face swap selfie onto raw image ───────────────────────────────
    const faceSwappedUrl = await faceSwap(piApiKey, rawImageUrl, project.selfie_url)
    console.log(`Face swap ready: ${faceSwappedUrl}`)

    // ── Insert new redo row + mark original as revised ────────────────────────
    const [{ data: newGen, error: insertError }, { error: updateError }] = await Promise.all([
      supabase
        .from('media_generations')
        .insert({
          vision_project_id: gen.vision_project_id,
          media_type:        'Image',
          prompt_text:       revisedPrompt,
          video_prompt:      revisedVideoPrompt,
          negative_prompt:   NEGATIVE_PROMPT,
          media_url:         faceSwappedUrl,
          is_selected:       false,
          revision_count:    0,
          order_num:         gen.order_num,
          is_redo:           true,
          affirmation:       gen.affirmation ?? null,
          affirmation_enabled: true,
        })
        .select()
        .single(),
      supabase
        .from('media_generations')
        .update({ revision_count: 1 })
        .eq('id', generation_id),
    ])

    if (insertError) return json({ error: insertError.message }, 500)
    if (updateError) console.error('Failed to mark original revision_count:', updateError)

    return json({ success: true, generation: newGen })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: String(err) }, 500)
  }
})

// ─── Gemini prompt revision ───────────────────────────────────────────────────

async function revisePrompts(
  apiKey: string,
  originalPrompt: string,
  feedback: string,
): Promise<{ imagePrompt: string; videoPrompt: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert AI image and video prompt engineer.

Original image prompt: "${originalPrompt}"

User feedback: "${feedback}"

Revise the image prompt based on the feedback. Keep it cinematic, photorealistic, single subject.

CRITICAL — SPECIFIC OBJECTS:
If the user's feedback mentions a specific brand, model, or named object, include the EXACT name in the prompt.
- "BMW R 1200 GS" → write "BMW R 1200 GS adventure motorcycle" — never just "motorcycle"
- "Porsche 911" → write "Porsche 911 Carrera" — never just "sports car"
- "Sunseeker yacht" → write "Sunseeker yacht" — never just "boat"
Generic substitutions destroy the user's vision. Use the exact name they provided.

Also write a short video prompt (1-2 sentences, ~100 chars) for animating this scene — describe what physically moves (fabric, water, light, smoke) and the subject's emotional state. Never just describe camera movement.

Return ONLY a JSON object: { "image_prompt": "...", "video_prompt": "..." }`,
          }],
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 512,
          response_mime_type: 'application/json',
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini revision failed: ${await res.text()}`)
  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  try {
    const parsed = JSON.parse(raw)
    return {
      imagePrompt: parsed.image_prompt ?? originalPrompt,
      videoPrompt: parsed.video_prompt ?? '',
    }
  } catch {
    return { imagePrompt: originalPrompt, videoPrompt: '' }
  }
}

// ─── Step 1: Flux-1-dev text-to-image ────────────────────────────────────────

async function generateFluxImage(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(PIAPI_BASE, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'Qubico/flux1-dev',
      task_type: 'txt2img',
      input: {
        prompt,
        negative_prompt: NEGATIVE_PROMPT,
        width: 768,
        height: 1024,
        guidance_scale: 3.5,
        num_inference_steps: 28,
        process_mode: 'fast',
      },
    }),
  })
  if (!res.ok) throw new Error(`Flux submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Flux: no task_id in response: ${JSON.stringify(data)}`)
  console.log(`Flux task submitted: ${taskId}`)
  return await pollTask(apiKey, taskId, 'image_url', 30, 5000)
}

// ─── Step 2: PiAPI Face Swap ──────────────────────────────────────────────────

async function faceSwap(apiKey: string, targetImageUrl: string, swapImageUrl: string): Promise<string> {
  const res = await fetch(PIAPI_BASE, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'Qubico/image-toolkit',
      task_type: 'face-swap',
      input: {
        target_image: targetImageUrl,
        swap_image:   swapImageUrl,
      },
    }),
  })
  if (!res.ok) throw new Error(`Face swap submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Face swap: no task_id: ${JSON.stringify(data)}`)
  console.log(`Face swap task submitted: ${taskId}`)
  return await pollTask(apiKey, taskId, 'image_url', 24, 5000)
}

// ─── Generic PiAPI task poller ────────────────────────────────────────────────

async function pollTask(
  apiKey: string,
  taskId: string,
  outputKey: string,
  maxAttempts: number,
  intervalMs: number,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs)
    const res = await fetch(PIAPI_FETCH(taskId), {
      headers: { 'X-API-Key': apiKey },
    })
    if (!res.ok) {
      console.warn(`Poll ${taskId} attempt ${attempt + 1}: HTTP ${res.status}`)
      continue
    }
    const data = await res.json()
    const status: string = data?.data?.status ?? ''
    console.log(`Poll ${taskId} attempt ${attempt + 1}: ${status}`)

    if (status === 'completed') {
      const url = data?.data?.output?.[outputKey]
        ?? data?.data?.output?.image_url
        ?? data?.data?.output?.image
        ?? data?.data?.output?.url
      if (url) return url
      throw new Error(`Task ${taskId} completed but no URL in output: ${JSON.stringify(data?.data?.output)}`)
    }
    if (status === 'failed') {
      throw new Error(`Task ${taskId} failed: ${JSON.stringify(data?.data?.error)}`)
    }
    // pending / processing — keep polling
  }
  throw new Error(`Task ${taskId} timed out after ${maxAttempts} attempts`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
