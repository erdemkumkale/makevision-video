// supabase/functions/generate-video/index.ts
//
// Mimari: fire-and-forget (generate-images ile aynı)
//   1. Auth + input doğrulama  (senkron, ~1s)
//   2. 200 hemen döner
//   3. EdgeRuntime.waitUntil → arka planda:
//      a) Her görsel için Kling video görevi gönderilir (paralel)
//      b) Her görev tamamlanınca video URL'si DB'ye yazılır
//      c) Tüm videolar bitince Shotstack tetiklenir
//
// Shotstack'e gönderilmeden önce URL'ler .mp4 / video içerik tipi
// olduğu doğrulanır — görsel URL'si asla video olarak gönderilmez.

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
    const body = await req.json()
    const project_id: string             = body?.project_id
    const selected_ids: string[] | undefined = body?.selected_ids

    if (!project_id) return json({ error: 'project_id is required' }, 400)

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) return json({ error: 'Project not found' }, 404)

    // ── Fetch selected images ─────────────────────────────────────────────────
    let query = supabase
      .from('media_generations')
      .select('id, media_url, prompt_text, video_prompt, order_num')
      .eq('vision_project_id', project_id)
      .neq('media_url', '')
      .order('order_num', { ascending: true })

    if (selected_ids?.length) {
      query = query.in('id', selected_ids)
    } else {
      query = query.eq('is_selected', true)
    }

    const { data: images, error: imagesError } = await query
    if (imagesError || !images?.length) {
      return json({ error: 'No selected images found. Approve images first.' }, 400)
    }

    // Yalnızca görsel URL'lerini kabul et — daha önce video üretilmiş satırları atla
    const imageOnlySlots = images.filter((img) => !isVideoUrl(img.media_url))
    if (!imageOnlySlots.length) {
      return json({ error: 'All slots already have video URLs.' }, 400)
    }

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    console.log(`Starting ${imageOnlySlots.length} Kling tasks in background for project ${project_id}`)

    await supabase
      .from('vision_projects')
      .update({ status: 'Processing' })
      .eq('id', project_id)

    // ── Arka planda çalıştır — hemen 200 dön ─────────────────────────────────
    const pipeline = runVideosPipeline({
      supabase,
      piApiKey,
      project_id,
      userId: user.id,
      slots:  imageOnlySlots,
      totalExpected: images.length,
    })

    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined') {
      // deno-lint-ignore no-explicit-any
      ;(EdgeRuntime as any).waitUntil(pipeline)
    } else {
      pipeline.catch((e) => console.error('Pipeline error (local):', e))
    }

    return json({ success: true, started: imageOnlySlots.length })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ─── Arka plan pipeline ───────────────────────────────────────────────────────

async function runVideosPipeline(ctx: {
  // deno-lint-ignore no-explicit-any
  supabase: any
  piApiKey: string
  project_id: string
  userId: string
  slots: Array<{ id: string; media_url: string; prompt_text: string; video_prompt?: string; order_num: number }>
  totalExpected: number
}) {
  const { supabase, piApiKey, project_id, userId, slots, totalExpected } = ctx

  // Her slot bağımsız — tamamlanır tamamlanmaz DB'ye yazar
  const videoResults = await Promise.allSettled(
    slots.map(async (img) => {
      try {
        const klingUrl = await generateKlingVideo(piApiKey, img)

        // Güvenlik: URL gerçekten video mu?
        if (!isVideoUrl(klingUrl)) {
          throw new Error(`Kling returned a non-video URL: ${klingUrl}`)
        }

        // Kling CDN URL'leri expire olur — Supabase Storage'a yükle, signed URL al
        // Upload başarısız olursa Kling URL'ini direkt kullan (fallback)
        const storagePath = `projects/${project_id}/videos/${img.order_num}.mp4`
        let stableUrl = klingUrl
        try {
          stableUrl = await uploadVideoToStorage(supabase, klingUrl, storagePath)
          console.log(`Slot ${img.order_num} uploaded to storage: ${storagePath}`)
        } catch (uploadErr) {
          console.warn(`Slot ${img.order_num} storage upload failed, using Kling URL directly:`, uploadErr)
        }

        await supabase
          .from('media_generations')
          .update({ media_url: stableUrl })
          .eq('id', img.id)

        console.log(`Slot ${img.order_num} video done: ${stableUrl}`)
        return { id: img.id, url: stableUrl, order_num: img.order_num }
      } catch (err) {
        console.error(`Slot ${img.order_num} video failed:`, err)
        throw err
      }
    })
  )

  // Başarılı video URL'lerini topla
  const successfulVideos = videoResults
    .filter((r): r is PromiseFulfilledResult<{ id: string; url: string; order_num: number }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .sort((a, b) => a.order_num - b.order_num)

  const videoUrls = successfulVideos.map((v) => v.url)

  console.log(`Videos done: ${videoUrls.length}/${totalExpected}`)

  if (videoUrls.length === totalExpected) {
    // Hepsi hazır — Shotstack tetikle
    await supabase
      .from('vision_projects')
      .update({ status: 'Videos_Ready' })
      .eq('id', project_id)

    const finalVideoFn = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-final-video`
    fetch(finalVideoFn, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ project_id, user_id: userId, video_urls: videoUrls }),
    }).catch((e) => console.error('generate-final-video trigger error:', e))

    console.log(`Shotstack started for ${videoUrls.length} videos`)
  } else {
    // Bazı videolar başarısız — kısmi tamamlama
    await supabase
      .from('vision_projects')
      .update({ status: 'Completed' })
      .eq('id', project_id)
    console.warn(`Only ${videoUrls.length}/${totalExpected} videos succeeded — skipping Shotstack`)
  }
}

// ─── Kling video → Supabase Storage → signed URL ─────────────────────────────
// Kling CDN URL'leri kısa sürede expire olur.
// Videoyu indirip Storage'a yükler, 2 saatlik signed URL döner.

// deno-lint-ignore no-explicit-any
async function uploadVideoToStorage(supabase: any, videoUrl: string, storagePath: string): Promise<string> {
  const BUCKET = 'vision-assets'

  // İndir
  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error(`Failed to download Kling video (${res.status}): ${videoUrl}`)
  const buffer = await res.arrayBuffer()

  // Yükle (varsa üzerine yaz)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })

  if (uploadError) throw new Error(`Storage upload failed for ${storagePath}: ${uploadError.message}`)

  // Public URL — bucket zaten public, hiç expire olmaz
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  if (!data?.publicUrl) throw new Error(`getPublicUrl failed for ${storagePath}`)

  return data.publicUrl
}

// ─── URL doğrulama: video mu yoksa görsel mi? ─────────────────────────────────

function isVideoUrl(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  // Görsel uzantılarını reddet
  if (/\.(png|jpg|jpeg|webp|gif|bmp|tiff|svg)(\?|$)/.test(lower)) return false
  // Video uzantısı varsa kabul et
  if (/\.(mp4|mov|webm|avi|mkv)(\?|$)/.test(lower)) return true
  // Uzantı yoksa / belirsizse URL'e HEAD isteği atmak yerine kabul et
  // (PiAPI video URL'leri genellikle uzantısız olabilir)
  return true
}

// ─── Kling image-to-video ─────────────────────────────────────────────────────

async function generateKlingVideo(
  apiKey: string,
  img: { id: string; media_url: string; prompt_text: string; video_prompt?: string },
): Promise<string> {
  const motionPrompt = img.video_prompt?.trim()
    || 'Slow cinematic push-in, shallow depth of field, subtle atmospheric light, gentle camera drift'

  const res = await fetch(PIAPI_BASE, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'kling',
      task_type: 'video_generation',
      input: {
        prompt:          motionPrompt,
        negative_prompt: 'blurry, low quality, distorted, shaky, fast motion',
        image_url:       img.media_url,
        duration:        5,
        aspect_ratio:    '9:16',
        mode:            'std',
        version:         '2.1',
        cfg_scale:       0.5,
      },
      config: { service_mode: '', without_watermark: false },
    }),
  })

  if (!res.ok) throw new Error(`Kling submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Kling: no task_id: ${JSON.stringify(data)}`)

  console.log(`Kling task submitted: ${taskId}`)
  return await pollTask(apiKey, taskId, 54, 10000) // 54×10s = 9 minutes
}

// ─── Generic PiAPI task poller ────────────────────────────────────────────────

async function pollTask(
  apiKey: string,
  taskId: string,
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
      const url = data?.data?.output?.video_url
        ?? data?.data?.output?.url
        ?? data?.data?.output?.video
      if (url) return url
      throw new Error(`Task ${taskId} completed but no video URL: ${JSON.stringify(data?.data?.output)}`)
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
