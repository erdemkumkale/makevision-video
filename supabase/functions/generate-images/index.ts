// supabase/functions/generate-images/index.ts
//
// İki aşamalı pipeline — her aşama ~120s, Edge Function limitine sığar:
//
//   Phase "flux":
//     Tüm Flux task'larını 3'erli batch ile işle → flux URL'lerini döndür
//     Süre: 2 batch × 90s = ~120s ✓
//
//   Phase "faceswap":
//     flux_slots'tan URL'leri al → faceswap yap → DB'ye kaydet
//     Süre: 2 batch × 60s = ~90s ✓
//
//   Frontend her iki aşamayı sırayla BEKLEYEREK çağırır (~3-4dk toplam).
//   Fire-and-forget YOK — Edge Function ölmeden tamamlanır.

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

    const body = await req.json()
    const { project_id, phase, flux_slots } = body

    if (!project_id) return json({ error: 'project_id is required' }, 400)
    if (!phase || !['flux', 'faceswap'].includes(phase)) {
      return json({ error: 'phase must be "flux" or "faceswap"' }, 400)
    }

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id, selfie_url')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) return json({ error: 'Project not found' }, 404)

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    // ── Phase 1: Flux ─────────────────────────────────────────────────────────
    if (phase === 'flux') {
      const { data: generations, error: genError } = await supabase
        .from('media_generations')
        .select('id, prompt_text, negative_prompt, order_num')
        .eq('vision_project_id', project_id)
        .eq('media_url', '')
        .order('order_num', { ascending: true })

      if (genError || !generations?.length) {
        return json({ error: 'No pending generations found' }, 400)
      }

      console.log(`Flux phase: ${generations.length} slots`)
      const result = await runFluxPhase(piApiKey, generations)
      return json({ success: true, flux_slots: result })
    }

    // ── Phase 2: Faceswap ─────────────────────────────────────────────────────
    if (phase === 'faceswap') {
      if (!project.selfie_url) return json({ error: 'No selfie_url on project' }, 400)
      if (!Array.isArray(flux_slots) || !flux_slots.length) {
        return json({ error: 'flux_slots required for faceswap phase' }, 400)
      }

      console.log(`Faceswap phase: ${flux_slots.length} slots`)
      await runFaceswapPhase(supabase, piApiKey, project_id, project.selfie_url, flux_slots)
      return json({ success: true })
    }

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ─── Phase 1: Flux — hepsini aynı anda submit et, hepsini paralel poll et ─────
// PiAPI 3 eşzamanlı işler, diğerleri queue'da bekler.
// Paralel polling devam ederken queue'dakiler de tamamlanır.
// Toplam süre: ~6s submit + ~90s poll = ~96s (150s limitin altında ✓)

type FluxSlot = { id: string; order_num: number; flux_url: string | null; error: string | null }

async function runFluxPhase(
  piApiKey: string,
  generations: Array<{ id: string; prompt_text: string; negative_prompt: string; order_num: number }>
): Promise<FluxSlot[]> {
  // Hepsini aynı anda submit et
  console.log(`Flux: submitting all ${generations.length} tasks simultaneously`)
  const submitted = await Promise.all(generations.map(async (gen) => {
    try {
      const taskId = await submitFlux(piApiKey, gen.prompt_text, gen.negative_prompt)
      console.log(`Slot ${gen.order_num} submitted: ${taskId}`)
      return { gen, taskId, error: null }
    } catch (err) {
      console.error(`Slot ${gen.order_num} submit failed:`, String(err))
      return { gen, taskId: null, error: String(err) }
    }
  }))

  // Hepsini paralel poll et — PiAPI queue'su işledikçe tamamlanır
  console.log('Flux: polling all tasks in parallel')
  return Promise.all(submitted.map(async ({ gen, taskId, error }) => {
    if (!taskId) return { id: gen.id, order_num: gen.order_num, flux_url: null, error }
    try {
      const flux_url = await pollTask(piApiKey, taskId, 'image_url', 18, 5000)
      console.log(`Slot ${gen.order_num} flux done`)
      return { id: gen.id, order_num: gen.order_num, flux_url, error: null }
    } catch (err) {
      console.error(`Slot ${gen.order_num} flux poll failed:`, String(err))
      return { id: gen.id, order_num: gen.order_num, flux_url: null, error: String(err) }
    }
  }))
}

// ─── Phase 2: Faceswap — hepsini aynı anda submit et, paralel poll et ────────

async function runFaceswapPhase(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  piApiKey: string,
  project_id: string,
  selfieUrl: string,
  flux_slots: FluxSlot[]
): Promise<void> {
  const validSlots = flux_slots.filter(s => s.flux_url)

  // Hepsini aynı anda submit et
  console.log(`Faceswap: submitting all ${validSlots.length} tasks simultaneously`)
  const submitted = await Promise.all(validSlots.map(async (slot) => {
    try {
      const taskId = await submitFaceswap(piApiKey, slot.flux_url!, selfieUrl)
      console.log(`Slot ${slot.order_num} faceswap submitted: ${taskId}`)
      return { slot, taskId, error: null }
    } catch (err) {
      console.error(`Slot ${slot.order_num} faceswap submit failed:`, String(err))
      return { slot, taskId: null, error: String(err) }
    }
  }))

  // Hepsini paralel poll et
  console.log('Faceswap: polling all tasks in parallel')
  const polled = await Promise.all(submitted.map(async ({ slot, taskId, error }) => {
    if (!taskId) return { slot, finalUrl: null, error }
    try {
      const finalUrl = await pollTask(piApiKey, taskId, 'image_url', 18, 5000)
      console.log(`Slot ${slot.order_num} faceswap done`)
      return { slot, finalUrl, error: null }
    } catch (err) {
      console.error(`Slot ${slot.order_num} faceswap poll failed:`, String(err))
      return { slot, finalUrl: null, error: String(err) }
    }
  }))

  // DB güncelle
  await Promise.all(polled.map(async ({ slot, finalUrl, error }) => {
    if (!finalUrl) {
      await supabase.from('media_generations')
        .update({ error: error ?? 'Faceswap failed' })
        .eq('id', slot.id)
      return
    }
    const storagePath = `projects/${project_id}/images/${slot.order_num}.jpg`
    let stableUrl = finalUrl
    try {
      stableUrl = await uploadToStorage(supabase, finalUrl, storagePath)
    } catch (uploadErr) {
      console.warn(`Slot ${slot.order_num} storage upload failed, using PiAPI URL:`, uploadErr)
    }
    await supabase.from('media_generations')
      .update({ media_url: stableUrl, error: null })
      .eq('id', slot.id)
  }))

  // Failed flux slotlarına hata yaz
  const failedSlots = flux_slots.filter(s => !s.flux_url)
  await Promise.all(failedSlots.map(s =>
    supabase.from('media_generations')
      .update({ error: s.error ?? 'Flux generation failed' })
      .eq('id', s.id)
  ))

  await supabase.from('vision_projects')
    .update({ status: 'Images_Ready' })
    .eq('id', project_id)

  console.log(`Project ${project_id}: faceswap phase complete → Images_Ready`)
}

// ─── Submit helpers ───────────────────────────────────────────────────────────

async function submitFlux(apiKey: string, prompt: string, negativePrompt: string): Promise<string> {
  const res = await fetch(PIAPI_BASE, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'Qubico/flux1-dev',
      task_type: 'txt2img',
      input: { prompt, negative_prompt: negativePrompt, width: 768, height: 1024, guidance_scale: 3.5, num_inference_steps: 28 },
    }),
  })
  if (!res.ok) throw new Error(`Flux submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Flux: no task_id: ${JSON.stringify(data)}`)
  return taskId
}

async function submitFaceswap(apiKey: string, targetUrl: string, swapUrl: string): Promise<string> {
  const res = await fetch(PIAPI_BASE, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'Qubico/image-toolkit',
      task_type: 'face-swap',
      input: { target_image: targetUrl, swap_image: swapUrl },
    }),
  })
  if (!res.ok) throw new Error(`Faceswap submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Faceswap: no task_id: ${JSON.stringify(data)}`)
  return taskId
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
      const url = data?.data?.output?.[outputKey] ?? data?.data?.output?.image_url ?? data?.data?.output?.image ?? data?.data?.output?.url
      if (url) return url
      throw new Error(`Task ${taskId} completed but no URL: ${JSON.stringify(data?.data?.output)}`)
    }
    if (status === 'failed') throw new Error(`Task ${taskId} failed: ${JSON.stringify(data?.data?.error)}`)
  }
  throw new Error(`Task ${taskId} timed out after ${maxAttempts} attempts`)
}

// ─── Storage ──────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function uploadToStorage(supabase: any, imageUrl: string, storagePath: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const { error } = await supabase.storage.from('vision-assets').upload(storagePath, buffer, { contentType, upsert: true })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  const { data } = supabase.storage.from('vision-assets').getPublicUrl(storagePath)
  if (!data?.publicUrl) throw new Error(`getPublicUrl failed`)
  return data.publicUrl
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
