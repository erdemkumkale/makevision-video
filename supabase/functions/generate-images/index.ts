// supabase/functions/generate-images/index.ts
// Pipeline: 6 slots run FULLY in parallel.
// Each slot: Flux-1-dev (txt→img) → PiAPI Face Swap → DB update
// Face swap starts immediately when its Flux task finishes — no waiting for other slots.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE   = 'https://api.piapi.ai/api/v1/task'
const PIAPI_FETCH  = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!

    const anonClient = createClient(supabaseUrl, anonKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // ── Input ─────────────────────────────────────────────────────────────────
    const { project_id } = await req.json()
    if (!project_id) return json({ error: 'project_id is required' }, 400)

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id, selfie_url')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) return json({ error: 'Project not found' }, 404)
    if (!project.selfie_url) return json({ error: 'No selfie_url on project' }, 400)

    const { data: generations, error: genError } = await supabase
      .from('media_generations')
      .select('id, prompt_text, negative_prompt, order_num')
      .eq('vision_project_id', project_id)
      .eq('media_url', '')
      .order('order_num', { ascending: true })

    if (genError || !generations?.length) {
      return json({ error: 'No pending generations found. Run generate-prompts first.' }, 400)
    }

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    console.log(`Processing ${generations.length} images in parallel for project ${project_id}`)

    // ── Full pipeline per slot — all 6 run concurrently ──────────────────────
    // Each slot: Flux → face swap → DB update, independently.
    // Face swap fires as soon as that slot's Flux is done, not after all 6.
    const results = await Promise.all(
      generations.map(async (gen) => {
        try {
          const rawUrl      = await generateFluxImage(piApiKey, gen.prompt_text, gen.negative_prompt)
          const finalUrl    = await faceSwap(piApiKey, rawUrl, project.selfie_url)
          await supabase
            .from('media_generations')
            .update({ media_url: finalUrl })
            .eq('id', gen.id)
          console.log(`Slot ${gen.order_num} done: ${finalUrl}`)
          return { id: gen.id, url: finalUrl, ok: true }
        } catch (err) {
          console.error(`Slot ${gen.order_num} failed:`, err)
          return { id: gen.id, url: null, ok: false, error: String(err) }
        }
      })
    )

    const successCount = results.filter((r) => r.ok).length
    const failedResults = results.filter((r) => !r.ok)

    // Mark failed slots in DB so frontend can detect them specifically
    if (failedResults.length > 0) {
      await Promise.all(
        failedResults.map((r) =>
          supabase
            .from('media_generations')
            .update({ error: r.error ?? 'Generation failed' })
            .eq('id', r.id)
        )
      )
    }

    // Always set Images_Ready so frontend can proceed with partial results
    // (review page polls for media_url and shows retry for empty slots)
    await supabase
      .from('vision_projects')
      .update({ status: 'Images_Ready' })
      .eq('id', project_id)

    return json({
      success: successCount > 0,
      generated: successCount,
      total: generations.length,
      ...(failedResults.length ? { failures: failedResults.map((r) => r.error) } : {}),
    })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ─── Step 1: Flux-1-dev text-to-image ────────────────────────────────────────

async function generateFluxImage(
  apiKey: string,
  prompt: string,
  negativePrompt: string,
): Promise<string> {
  const res = await fetch(PIAPI_BASE, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'Qubico/flux1-dev',
      task_type: 'txt2img',
      input: {
        prompt,
        negative_prompt: negativePrompt,
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

async function faceSwap(
  apiKey: string,
  targetImageUrl: string,  // the Flux-generated image (face to replace)
  swapImageUrl: string,    // the user's selfie (face to use)
): Promise<string> {
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
