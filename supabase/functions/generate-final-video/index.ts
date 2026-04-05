// supabase/functions/generate-final-video/index.ts
//
// Montaj fonksiyonu — Kling/Udio ÇALIŞTIRILMAZ.
// İki mod desteklenir:
//   A) video_paths: string[6]  → storage path'leri, signed URL üretilir
//   B) video_urls:  string[6]  → hazır URL'ler, direkt kullanılır
// Müzik havuzundan rastgele seçim yapılır (signed URL).
// Shotstack ile birleştirilir, sonuç DB'ye yazılır.
//
// Request:
//   { project_id, user_id, video_paths?: string[6], video_urls?: string[6] }
//
// Response: { job_id: string }  ← frontend video_jobs tablosunu poll eder

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET           = 'vision-assets'
const SIGNED_URL_TTL   = 7200  // 2 saat — Shotstack render süresini karşılar
const SHOTSTACK_RENDER = 'https://api.shotstack.io/v1/render'

// Müzik havuzu — vision-assets bucket root'unda olmalı
const MUSIC_POOL = [
  'vision-music-1.mp3',
  'vision-music-2.mp3',
  'vision-music-3.mp3',
]

// ─── Entry point ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const shotstackKey = Deno.env.get('SHOTSTACK_API_KEY')
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!shotstackKey) return json({ error: 'SHOTSTACK_API_KEY not set' }, 500)

    const body = await req.json()
    const project_id: string    = body?.project_id
    const user_id: string       = body?.user_id
    const video_paths: string[] = body?.video_paths   // storage paths → signed URL üretilir
    const video_urls: string[]  = body?.video_urls    // hazır URL'ler → direkt kullanılır

    if (!project_id)  return json({ error: 'project_id is required' }, 400)
    if (!user_id)     return json({ error: 'user_id is required' }, 400)

    const hasVideoPaths = Array.isArray(video_paths) && video_paths.length === 6
    const hasVideoUrls  = Array.isArray(video_urls)  && video_urls.length  === 6
    if (!hasVideoPaths && !hasVideoUrls)
      return json({ error: 'Provide either video_paths[6] or video_urls[6]' }, 400)

    // Görsel URL'si gelirse Shotstack'e göndermeden reddet
    if (hasVideoUrls) {
      const imageExtensions = /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?|$)/i
      const badUrls = video_urls.filter((u: string) => imageExtensions.test(u))
      if (badUrls.length > 0) {
        return json({
          error: `Görsel URL'leri video olarak gönderilemez. Kling videoları henüz hazır değil. Lütfen birkaç dakika bekleyin.`,
          bad_urls: badUrls,
        }, 400)
      }
    }

    // Service role client — RLS bypass
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // ── Job kaydı oluştur, hemen dön ─────────────────────────────────────────
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .insert({ vision_project_id: project_id, user_id, status: 'processing' })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('Job insert failed:', jobError)
      return json({ error: 'Failed to create job record' }, 500)
    }

    const jobId = job.id
    console.log(`Job ${jobId} created for project ${project_id}`)

    // ── Arka planda çalıştır ──────────────────────────────────────────────────
    const pipeline = runPipeline({ jobId, project_id, user_id, video_paths, video_urls, shotstackKey, supabase })

    // @ts-ignore — Supabase Edge Runtime global
    if (typeof EdgeRuntime !== 'undefined') {
      // deno-lint-ignore no-explicit-any
      ;(EdgeRuntime as any).waitUntil(pipeline)
    } else {
      pipeline.catch((e) => console.error('Pipeline error (local):', e))
    }

    return json({ success: true, job_id: jobId })

  } catch (err) {
    console.error('Handler error:', err)
    return json({ error: String(err) }, 500)
  }
})

// ─── Arka plan pipeline ───────────────────────────────────────────────────────

async function runPipeline(ctx: {
  jobId: string
  project_id: string
  user_id: string
  video_paths?: string[]
  video_urls?: string[]
  shotstackKey: string
  // deno-lint-ignore no-explicit-any
  supabase: any
}) {
  const { jobId, project_id, video_paths, video_urls, shotstackKey, supabase } = ctx

  const fail = async (msg: string) => {
    console.error(`Job ${jobId} failed: ${msg}`)
    await supabase.from('video_jobs').update({ status: 'failed', error: msg }).eq('id', jobId)
    await supabase.from('vision_projects').update({ status: 'Failed' }).eq('id', project_id)
  }

  try {
    // ── 1. Video signed URL'leri hazırla ─────────────────────────────────────
    let videoSignedUrls: string[]

    if (video_urls && video_urls.length === 6) {
      // Mod B: hazır URL'ler geldi, direkt kullan
      console.log(`Job ${jobId}: using ${video_urls.length} provided video URLs`)
      videoSignedUrls = video_urls
    } else {
      // Mod A: storage path'lerinden signed URL üret
      console.log(`Job ${jobId}: generating signed URLs for ${video_paths!.length} video paths`)
      videoSignedUrls = []
      for (const path of video_paths!) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL)
        if (error || !data?.signedUrl)
          throw new Error(`Signed URL failed for ${path}: ${error?.message}`)
        videoSignedUrls.push(data.signedUrl)
        console.log(`Signed video: ${path}`)
      }
    }

    // ── 2. Müzik havuzundan rastgele seç, signed URL üret (opsiyonel) ──────────
    let musicSignedUrl: string | null = null
    try {
      const musicPath = MUSIC_POOL[Math.floor(Math.random() * MUSIC_POOL.length)]
      console.log(`Job ${jobId}: selected music → ${musicPath}`)
      const { data: musicData, error: musicError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(musicPath, SIGNED_URL_TTL)
      if (musicError || !musicData?.signedUrl) {
        console.warn(`Job ${jobId}: music signed URL failed (${musicError?.message}) — proceeding without music`)
      } else {
        musicSignedUrl = musicData.signedUrl
        console.log(`Job ${jobId}: music signed URL ready`)
      }
    } catch (musicErr) {
      console.warn(`Job ${jobId}: music setup error — proceeding without music:`, musicErr)
    }

    // ── 3. Shotstack payload ──────────────────────────────────────────────────
    // fit / aspectRatio KULLANILMIYOR — orijinal video formatı korunur
    // Her klip 5s, sıralı, klipler arası fade geçişi (toplam 30s)
    const CLIP_LENGTH = 5
    const videoClips = videoSignedUrls.map((src, i) => ({
      asset: { type: 'video', src },
      start: i * CLIP_LENGTH,
      length: CLIP_LENGTH,
      transition: {
        ...(i > 0 ? { in: 'fade' } : {}),
        ...(i < videoSignedUrls.length - 1 ? { out: 'fade' } : {}),
      },
    }))

    const shotstackPayload = {
      timeline: {
        // Müzik varsa ekle, yoksa soundtrack olmadan devam et
        ...(musicSignedUrl ? {
          soundtrack: { src: musicSignedUrl, effect: 'fadeOut' },
        } : {}),
        background: '#000000',
        tracks: [{ clips: videoClips }],
      },
      output: {
        format: 'mp4',
        resolution: 'sd',   // maliyet optimizasyonu
        // aspectRatio kasıtlı olarak yok — orijinal format korunur
      },
    }

    console.log(`Job ${jobId}: submitting to Shotstack`)

    // ── 4. Shotstack render başlat ────────────────────────────────────────────
    const renderRes = await fetch(SHOTSTACK_RENDER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotstackKey },
      body: JSON.stringify(shotstackPayload),
    })

    if (!renderRes.ok)
      throw new Error(`Shotstack submit (${renderRes.status}): ${await renderRes.text()}`)

    const renderData = await renderRes.json()
    const renderId: string = renderData?.response?.id
    if (!renderId)
      throw new Error(`Shotstack no render id: ${JSON.stringify(renderData)}`)

    console.log(`Job ${jobId}: Shotstack render queued → ${renderId}`)

    // ── 5. Shotstack poll — max 5 dakika ─────────────────────────────────────
    let finalVideoUrl: string | null = null

    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(5000)

      const statusRes = await fetch(`${SHOTSTACK_RENDER}/${renderId}`, {
        headers: { 'x-api-key': shotstackKey },
      })

      if (!statusRes.ok) {
        console.warn(`Shotstack poll #${attempt + 1}: HTTP ${statusRes.status}`)
        continue
      }

      const d = await statusRes.json()
      const status: string = d?.response?.status ?? ''
      console.log(`Job ${jobId}: Shotstack poll #${attempt + 1} → ${status}`)

      if (status === 'done') {
        finalVideoUrl = d?.response?.url ?? null
        if (!finalVideoUrl) throw new Error('Shotstack done but no URL in response')
        break
      }

      if (status === 'failed')
        throw new Error(`Shotstack render failed: ${JSON.stringify(d?.response?.error)}`)

      // queued / rendering / saving — devam et
    }

    if (!finalVideoUrl) throw new Error('Shotstack timed out after 5 minutes')

    // ── 6. DB'ye yaz ─────────────────────────────────────────────────────────
    await Promise.all([
      supabase
        .from('video_jobs')
        .update({ status: 'completed', video_url: finalVideoUrl })
        .eq('id', jobId),
      supabase
        .from('vision_projects')
        .update({ status: 'Completed', final_video_url: finalVideoUrl })
        .eq('id', project_id),
    ])

    console.log(`Job ${jobId}: DONE → ${finalVideoUrl}`)

  } catch (err) {
    await fail(String(err))
  }
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
