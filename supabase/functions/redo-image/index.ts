// supabase/functions/redo-image/index.ts
//
// Mimari: submit-and-return (timeout-safe)
//   1. Gemini ile prompt revize et (~2s)
//   2. Flux task'ı submit et (~1s)
//   3. Pending redo row'u DB'ye yaz (media_url: '')
//   4. Task ID'yi story_inputs.redo_tasks'a kaydet
//   5. Hemen dön → review sayfası poll-redo-tasks ile takip eder

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE = 'https://api.piapi.ai/api/v1/task'

const NEGATIVE_PROMPT =
  'stock photo, amateur photography, flat lighting, overexposed, underexposed, blurry, low quality, grainy, washed out colors, boring composition, generic, cliché, distorted face, extra limbs, watermark, text overlay, cartoon, illustration, drawing'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { generation_id, feedback } = await req.json()
    if (!generation_id || !feedback?.trim()) {
      return json({ error: 'generation_id and feedback are required' }, 400)
    }

    // ── Fetch generation + project ────────────────────────────────────────────
    const { data: gen, error: genError } = await supabase
      .from('media_generations')
      .select('id, prompt_text, revision_count, vision_project_id, order_num, affirmation')
      .eq('id', generation_id)
      .single()

    if (genError || !gen) return json({ error: 'Generation not found' }, 404)

    // Allow retry if the existing redo resulted in error
    const { data: existingRedo } = await supabase
      .from('media_generations')
      .select('id, media_url')
      .eq('vision_project_id', gen.vision_project_id)
      .eq('order_num', gen.order_num)
      .eq('is_redo', true)
      .maybeSingle()

    const redoFailed = existingRedo?.media_url === 'error' || existingRedo?.media_url === ''
    if (gen.revision_count >= 1 && !redoFailed) return json({ error: 'Revision limit reached' }, 400)

    // If retrying a failed redo, delete the old failed row first
    if (redoFailed && existingRedo) {
      await supabase.from('media_generations').delete().eq('id', existingRedo.id)
      await supabase.from('media_generations').update({ revision_count: 0 }).eq('id', gen.id)
      gen.revision_count = 0
    }

    const { data: project } = await supabase
      .from('vision_projects')
      .select('user_id, selfie_url, story_inputs')
      .eq('id', gen.vision_project_id)
      .eq('user_id', user.id)
      .single()

    if (!project) return json({ error: 'Project not found or access denied' }, 403)
    if (!project.selfie_url) return json({ error: 'No selfie_url on project' }, 400)

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    // ── Gemini prompt revision (~2s) ──────────────────────────────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY')!
    const { imagePrompt, videoPrompt } = await revisePrompts(geminiKey, gen.prompt_text, feedback)
    console.log(`Revised prompt: ${imagePrompt.slice(0, 80)}...`)

    // ── Flux task submit (~1s) ────────────────────────────────────────────────
    const fluxRes = await fetch(PIAPI_BASE, {
      method: 'POST',
      headers: { 'X-API-Key': piApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Qubico/flux1-dev',
        task_type: 'txt2img',
        input: {
          prompt:              imagePrompt,
          negative_prompt:     NEGATIVE_PROMPT,
          width:               768,
          height:              1024,
          guidance_scale:      3.5,
          num_inference_steps: 28,
          process_mode:        'fast',
        },
      }),
    })
    if (!fluxRes.ok) return json({ error: `Flux submit failed: ${await fluxRes.text()}` }, 502)
    const fluxData = await fluxRes.json()
    const fluxTaskId = fluxData?.data?.task_id
    if (!fluxTaskId) return json({ error: 'Flux: no task_id returned' }, 502)
    console.log(`Flux task submitted: ${fluxTaskId}`)

    // ── Insert pending redo row ───────────────────────────────────────────────
    const { data: newGen, error: insertError } = await supabase
      .from('media_generations')
      .insert({
        vision_project_id:   gen.vision_project_id,
        media_type:          'Image',
        prompt_text:         imagePrompt,
        video_prompt:        videoPrompt,
        negative_prompt:     NEGATIVE_PROMPT,
        media_url:           '',
        is_selected:         false,
        revision_count:      0,
        order_num:           gen.order_num,
        is_redo:             true,
        affirmation:         gen.affirmation ?? null,
        affirmation_enabled: true,
      })
      .select()
      .single()

    if (insertError || !newGen) return json({ error: insertError?.message ?? 'Insert failed' }, 500)

    // ── Mark original as revised ──────────────────────────────────────────────
    await supabase
      .from('media_generations')
      .update({ revision_count: 1 })
      .eq('id', generation_id)

    // ── Save task state to story_inputs ───────────────────────────────────────
    const currentInputs = (project as any).story_inputs ?? {}
    const redoTasks = currentInputs.redo_tasks ?? {}
    redoTasks[newGen.id] = {
      phase:        'flux',
      flux_task_id: fluxTaskId,
      order_num:    gen.order_num,
      selfie_url:   project.selfie_url,
    }

    await supabase
      .from('vision_projects')
      .update({ story_inputs: { ...currentInputs, redo_tasks: redoTasks } })
      .eq('id', gen.vision_project_id)

    console.log(`Redo submitted for gen ${newGen.id}, flux_task: ${fluxTaskId}`)
    return json({ success: true, generation: newGen, polling: true })

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
        contents: [{ parts: [{ text: `You are an expert AI image and video prompt engineer.

Original image prompt: "${originalPrompt}"

User feedback: "${feedback}"

Revise the image prompt based on the feedback. Keep it cinematic, photorealistic, single subject.

CRITICAL — SPECIFIC OBJECTS:
If the user's feedback mentions a specific brand, model, or named object, include the EXACT name in the prompt.
- "BMW R 1200 GS" → write "BMW R 1200 GS adventure motorcycle" — never just "motorcycle"
- "Porsche 911" → write "Porsche 911 Carrera" — never just "sports car"
Generic substitutions destroy the user's vision. Use the exact name they provided.

Also write a short video prompt (1-2 sentences, ~100 chars) for animating this scene.

Return ONLY a JSON object: { "image_prompt": "...", "video_prompt": "..." }` }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 512, response_mime_type: 'application/json' },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini revision failed: ${await res.text()}`)
  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  try {
    const parsed = JSON.parse(raw)
    return { imagePrompt: parsed.image_prompt ?? originalPrompt, videoPrompt: parsed.video_prompt ?? '' }
  } catch {
    return { imagePrompt: originalPrompt, videoPrompt: '' }
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
