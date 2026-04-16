// supabase/functions/generate-images/index.ts
//
// Mimari: fire-and-forget
//   1. Auth + input doğrulama  (senkron, ~1s)
//   2. 200 hemen döner         → create.js review'e yönlendirir
//   3. Arka planda devam eder  → EdgeRuntime.waitUntil
//      Her slot: Flux (txt2img) → Face Swap → DB update (media_url)
//      Tüm slotlar paralel çalışır, birbirini beklemez.
//      İşlem bitince vision_projects.status = 'Images_Ready'
//
// Review sayfası DB'yi her 6s poll'lar, media_url dolunca gösterir.
// Eğer 5dk+ geçmesine rağmen boş slot varsa review sayfası Retry butonu gösterir.
// Retry güvenli: sadece media_url='' olan slotları yeniden işler.

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
    // ── 1. Auth ───────────────────────────────────────────────────────────────
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

    // ── 2. Input doğrulama ────────────────────────────────────────────────────
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

    console.log(`Starting ${generations.length} image slots in background for project ${project_id}`)

    // ── 3. Arka planda çalıştır — hemen 200 dön ──────────────────────────────
    const pipeline = runAllSlots({
      supabase,
      piApiKey,
      project_id,
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

// ─── Arka plan: tüm slotları paralel çalıştır ────────────────────────────────

async function runAllSlots(ctx: {
  // deno-lint-ignore no-explicit-any
  supabase: any
  piApiKey: string
  project_id: string
  selfieUrl: string
  generations: Array<{ id: string; prompt_text: string; negative_prompt: string; order_num: number }>
}) {
  const { supabase, piApiKey, project_id, selfieUrl, generations } = ctx

  // Her slot bağımsız çalışır — biri bitince hemen DB'ye yazar
  await Promise.all(
    generations.map((gen) => processSlotWithRetry({ supabase, piApiKey, project_id, selfieUrl, gen }))
  )

  // Tüm slotlar tamamlandı (başarılı veya başarısız) — status güncelle
  await supabase
    .from('vision_projects')
    .update({ status: 'Images_Ready' })
    .eq('id', project_id)

  console.log(`Project ${project_id}: all image slots processed → Images_Ready`)
}

// ─── Slot işleyici: otomatik retry (max 3 deneme) ────────────────────────────

async function processSlotWithRetry(ctx: {
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

    const rawUrl      = await generateFluxImage(piApiKey, gen.prompt_text, gen.negative_prompt)
    const safeSwapUrl = getSafeSwapImageUrl(selfieUrl)
    console.log(`Slot ${gen.order_num}: swap_image URL = ${safeSwapUrl.slice(0, 80)}...`)
    const faceSwapUrl = await faceSwap(piApiKey, rawUrl, safeSwapUrl)

    const storagePath = `projects/${project_id}/images/${gen.order_num}.jpg`
    let stableUrl = faceSwapUrl
    try {
      stableUrl = await uploadImageToStorage(supabase, faceSwapUrl, storagePath)
    } catch (uploadErr) {
      console.warn(`Slot ${gen.order_num} storage upload failed, using PiAPI URL:`, uploadErr)
    }

    await supabase
      .from('media_generations')
      .update({ media_url: stableUrl, error: null })
      .eq('id', gen.id)

    console.log(`Slot ${gen.order_num} ✓ (attempt ${attempt})`)

  } catch (err) {
    console.error(`Slot ${gen.order_num} failed (attempt ${attempt}):`, String(err))

    if (attempt < MAX_ATTEMPTS) {
      // Kısa bekleme sonra tekrar dene — PiAPI geçici hataları genellikle düzelir
      const waitMs = attempt * 4000   // 4s, 8s
      console.log(`Slot ${gen.order_num}: retrying in ${waitMs}ms...`)
      await sleep(waitMs)
      return processSlotWithRetry(ctx, attempt + 1)
    }

    // 3 denemede de başarısız — hatayı kaydet
    console.error(`Slot ${gen.order_num}: gave up after ${MAX_ATTEMPTS} attempts`)
    await supabase
      .from('media_generations')
      .update({ error: `Failed after ${MAX_ATTEMPTS} attempts: ${String(err)}` })
      .eq('id', gen.id)
  }
}

// ─── Storage: PiAPI geçici URL → Supabase Storage kalıcı public URL ──────────

// deno-lint-ignore no-explicit-any
async function uploadImageToStorage(supabase: any, imageUrl: string, storagePath: string): Promise<string> {
  const BUCKET = 'vision-assets'

  // İndir
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Image download failed (${res.status}): ${imageUrl}`)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'

  // Yükle
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // Public URL al (görsel için signed URL'e gerek yok — public bucket)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  if (!data?.publicUrl) throw new Error(`getPublicUrl failed for ${storagePath}`)

  return data.publicUrl
}

// ─── Selfie URL ───────────────────────────────────────────────────────────────
// Selfie'yi doğrudan Supabase public URL olarak kullan.
// images.weserv.nl proxy denemesi yapıldı ama PiAPI sunucuları erişemedi →
// "invalid request / failed to do request" hatası veriyordu.
// Supabase storage public bucket URL'leri PiAPI tarafından erişilebilir.

function getSafeSwapImageUrl(selfieUrl: string): string {
  return selfieUrl
}

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
        // process_mode: 'fast' kaldırıldı — fast kuyruğu tıkandığında task
        // "processing" durumunda sonsuza kalıyordu. Varsayılan kuyruk daha güvenilir.
      },
    }),
  })

  if (!res.ok) throw new Error(`Flux submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Flux: no task_id in response: ${JSON.stringify(data)}`)

  console.log(`Flux task submitted: ${taskId}`)
  return await pollTask(apiKey, taskId, 'image_url', 40, 5000)
}

// ─── Step 2: PiAPI Face Swap ──────────────────────────────────────────────────

async function faceSwap(
  apiKey: string,
  targetImageUrl: string,
  swapImageUrl: string,
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
  return await pollTask(apiKey, taskId, 'image_url', 36, 5000)
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
    // pending / processing — devam et
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
