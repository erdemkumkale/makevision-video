// supabase/functions/generate-images/index.ts
//
// Mimari: fire-and-forget
//   1. Auth + input doğrulama  (senkron, ~1s)
//   2. 200 hemen döner         → create.js review'e yönlendirir
//   3. Arka planda devam eder  → EdgeRuntime.waitUntil
//      Her slot bağımsız: Flux (txt2img) → Face Swap → DB update
//      Tüm slotlar paralel, her biri max 4dk timeout
//      İşlem bitince vision_projects.status = 'Images_Ready'

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE  = 'https://api.piapi.ai/api/v1/task'
const PIAPI_FETCH = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`

// ─── Entry point ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
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

    // Sadece boş slotları al (retry güvenliği: dolu slotlara dokunmaz)
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

    console.log(`Starting ${generations.length} slots for project ${project_id}`)

    const pipeline = runAllSlots({
      supabase, piApiKey, project_id,
      selfieUrl: project.selfie_url,
      generations,
    })

    // @ts-ignore — Supabase Edge Runtime global
    if (typeof EdgeRuntime !== 'undefined') {
      // deno-lint-ignore no-explicit-any
      ;(EdgeRuntime as any).waitUntil(pipeline)
    } else {
      pipeline.catch((e) => console.error('Pipeline error (local):', e))
    }

    return json({ success: true, started: generations.length })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ─── Tüm slotlar paralel — her biri max 4dk timeout ──────────────────────────

const SLOT_TIMEOUT_MS = 5 * 60 * 1000

async function runAllSlots(ctx: {
  // deno-lint-ignore no-explicit-any
  supabase: any
  piApiKey: string
  project_id: string
  selfieUrl: string
  generations: Array<{ id: string; prompt_text: string; negative_prompt: string; order_num: number }>
}) {
  const { supabase, piApiKey, project_id, selfieUrl, generations } = ctx

  await Promise.all(
    generations.map((gen) => {
      const slotPromise = processSlot({ supabase, piApiKey, project_id, selfieUrl, gen })
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`Slot ${gen.order_num} timed out`)), SLOT_TIMEOUT_MS)
      )
      return Promise.race([slotPromise, timeoutPromise]).catch(async (err) => {
        console.error(`Slot ${gen.order_num} killed:`, String(err))
        await supabase
          .from('media_generations')
          .update({ error: String(err) })
          .eq('id', gen.id)
      })
    })
  )

  await supabase
    .from('vision_projects')
    .update({ status: 'Images_Ready' })
    .eq('id', project_id)

  console.log(`Project ${project_id}: all slots done → Images_Ready`)
}

// ─── Tek slot işleyici: Flux → faceswap → storage → DB ───────────────────────

async function processSlot(ctx: {
  // deno-lint-ignore no-explicit-any
  supabase: any
  piApiKey: string
  project_id: string
  selfieUrl: string
  gen: { id: string; prompt_text: string; negative_prompt: string; order_num: number }
}, attempt = 1): Promise<void> {
  const MAX_ATTEMPTS = 3
  const { supabase, piApiKey, project_id, selfieUrl, gen } = ctx

  try {
    console.log(`Slot ${gen.order_num}: attempt ${attempt}/${MAX_ATTEMPTS}`)

    const fluxUrl     = await generateFluxImage(piApiKey, gen.prompt_text, gen.negative_prompt)
    const faceSwapUrl = await faceSwap(piApiKey, fluxUrl, selfieUrl)

    const storagePath = `projects/${project_id}/images/${gen.order_num}.jpg`
    let finalUrl = faceSwapUrl
    try {
      finalUrl = await uploadImageToStorage(supabase, faceSwapUrl, storagePath)
    } catch (uploadErr) {
      console.warn(`Slot ${gen.order_num}: storage upload failed, using PiAPI URL:`, uploadErr)
    }

    await supabase
      .from('media_generations')
      .update({ media_url: finalUrl, error: null })
      .eq('id', gen.id)

    console.log(`Slot ${gen.order_num} ✓`)

  } catch (err) {
    console.error(`Slot ${gen.order_num} attempt ${attempt} failed:`, String(err))

    if (attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 5000) // 5s, 10s
      return processSlot(ctx, attempt + 1)
    }

    await supabase
      .from('media_generations')
      .update({ error: `Failed after ${MAX_ATTEMPTS} attempts: ${String(err)}` })
      .eq('id', gen.id)
  }
}

// ─── Flux txt2img ─────────────────────────────────────────────────────────────

async function generateFluxImage(apiKey: string, prompt: string, negativePrompt: string): Promise<string> {
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
      },
    }),
  })
  if (!res.ok) throw new Error(`Flux submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Flux: no task_id: ${JSON.stringify(data)}`)
  console.log(`Slot flux task: ${taskId}`)
  return pollTask(apiKey, taskId, 'image_url', 18, 5000) // max 90s
}

// ─── Face Swap ────────────────────────────────────────────────────────────────

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
  if (!res.ok) throw new Error(`Faceswap submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Faceswap: no task_id: ${JSON.stringify(data)}`)
  console.log(`Slot faceswap task: ${taskId}`)
  return pollTask(apiKey, taskId, 'image_url', 18, 5000) // max 90s
}

// ─── Poller ───────────────────────────────────────────────────────────────────

async function pollTask(apiKey: string, taskId: string, outputKey: string, maxAttempts: number, intervalMs: number): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs)
    const res = await fetch(PIAPI_FETCH(taskId), { headers: { 'X-API-Key': apiKey } })
    if (!res.ok) { console.warn(`Poll ${taskId} attempt ${i + 1}: HTTP ${res.status}`); continue }
    const data = await res.json()
    const status: string = data?.data?.status ?? ''
    console.log(`Poll ${taskId} attempt ${i + 1}: ${status}`)
    if (status === 'completed') {
      const url = data?.data?.output?.[outputKey]
        ?? data?.data?.output?.image_url
        ?? data?.data?.output?.image
        ?? data?.data?.output?.url
      if (url) return url
      throw new Error(`Task ${taskId} completed but no URL: ${JSON.stringify(data?.data?.output)}`)
    }
    if (status === 'failed') throw new Error(`Task ${taskId} failed: ${JSON.stringify(data?.data?.error)}`)
  }
  throw new Error(`Task ${taskId} timed out after ${maxAttempts} attempts`)
}

// ─── Storage upload ───────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function uploadImageToStorage(supabase: any, imageUrl: string, storagePath: string): Promise<string> {
  const BUCKET = 'vision-assets'
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Image download failed (${res.status})`)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const { error: uploadError } = await supabase.storage
    .from(BUCKET).upload(storagePath, buffer, { contentType, upsert: true })
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  if (!data?.publicUrl) throw new Error(`getPublicUrl failed for ${storagePath}`)
  return data.publicUrl
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
