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

    const hasVideoPaths = Array.isArray(video_paths) && video_paths.length > 0
    const hasVideoUrls  = Array.isArray(video_urls)  && video_urls.length  > 0
    if (!hasVideoPaths && !hasVideoUrls)
      return json({ error: 'Provide either video_paths or video_urls (non-empty array)' }, 400)

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
  const { jobId, project_id, user_id: userId, video_paths, video_urls, shotstackKey, supabase } = ctx

  const fail = async (msg: string) => {
    console.error(`Job ${jobId} failed: ${msg}`)
    await supabase.from('video_jobs').update({ status: 'failed', error: msg }).eq('id', jobId)
    await supabase.from('vision_projects').update({ status: 'Failed' }).eq('id', project_id)
  }

  try {
    // ── 1. Video signed URL'leri hazırla ─────────────────────────────────────
    let videoSignedUrls: string[]

    if (video_urls && video_urls.length > 0) {
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

    // ── 3. Affirmation'ları DB'den çek ───────────────────────────────────────
    // Seçili media_generations'ların affirmation bilgisini order_num sırasıyla al
    const { data: selectedMedia } = await supabase
      .from('media_generations')
      .select('order_num, affirmation, affirmation_enabled')
      .eq('vision_project_id', project_id)
      .eq('is_selected', true)
      .order('order_num', { ascending: true })

    const affirmationMap: Record<number, string | null> = {}
    if (selectedMedia) {
      selectedMedia.forEach((row: { order_num: number; affirmation: string | null; affirmation_enabled: boolean }) => {
        if (row.affirmation_enabled && row.affirmation) {
          affirmationMap[row.order_num] = row.affirmation
        }
      })
    }
    console.log(`Job ${jobId}: affirmation map →`, JSON.stringify(affirmationMap))

    // ── 4. Shotstack payload ──────────────────────────────────────────────────
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

    // Text overlay clips — one per clip that has an enabled affirmation
    // Uses order_num index from affirmationMap (key = clip index in videoSignedUrls array)
    const textClips = videoSignedUrls.flatMap((_, i) => {
      // Try by index first, then by actual order_num from selectedMedia
      const orderNum = selectedMedia?.[i]?.order_num ?? i
      const rawText = affirmationMap[orderNum]
      if (!rawText) return []
      // Truncate to 40 chars to fit the vertical frame
      const text = rawText.length > 40 ? rawText.slice(0, 37) + '...' : rawText
      // Use HTML asset for semi-transparent background (readable on bright & dark videos)
      return [{
        asset: {
          type: 'html',
          html: `<p style="font-family:-apple-system,sans-serif;font-size:21px;color:#FFFFFF;text-align:center;background:rgba(0,0,0,0.55);padding:10px 20px;border-radius:6px;margin:0;line-height:1.4">${text}</p>`,
          width: 500,
          height: 80,
          background: 'transparent',
          position: 'center',
        },
        start: i * CLIP_LENGTH + 0.8,
        length: CLIP_LENGTH - 1.2,
        position: 'bottom',
        offset: { y: 0.12 },
        transition: { in: 'fade', out: 'fade' },
      }]
    })

    const tracks = textClips.length > 0
      ? [{ clips: textClips }, { clips: videoClips }]
      : [{ clips: videoClips }]

    const shotstackPayload = {
      timeline: {
        ...(musicSignedUrl ? {
          soundtrack: { src: musicSignedUrl, effect: 'fadeOut' },
        } : {}),
        background: '#000000',
        tracks,
      },
      output: {
        format: 'mp4',
        resolution: 'sd',
        aspectRatio: '9:16',
      },
    }

    console.log(`Job ${jobId}: submitting to Shotstack (${textClips.length} affirmation overlays)`)

    // ── 5. Shotstack render başlat ────────────────────────────────────────────
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

    // ── 6. Final videoyu Supabase Storage'a yükle (kalıcı URL) ───────────────
    // Shotstack CDN URL'leri expire olur — Storage'da sakla, kullanıcı 2 yıl
    // sonra girse de videosunu görebilsin.
    let permanentVideoUrl = finalVideoUrl  // fallback: Shotstack URL
    try {
      const videoRes = await fetch(finalVideoUrl)
      if (videoRes.ok) {
        const buffer = await videoRes.arrayBuffer()
        const storagePath = `projects/${project_id}/final.mp4`
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })
        if (uploadErr) {
          console.warn('Final video upload failed (using Shotstack URL):', uploadErr.message)
        } else {
          const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
          if (pubData?.publicUrl) {
            permanentVideoUrl = pubData.publicUrl
            console.log(`Job ${jobId}: final video saved to storage → ${storagePath}`)
          }
        }
      }
    } catch (uploadErr) {
      console.warn('Final video storage upload error (non-fatal):', uploadErr)
    }

    // ── 7. DB'ye yaz ─────────────────────────────────────────────────────────
    await Promise.all([
      supabase
        .from('video_jobs')
        .update({ status: 'completed', video_url: permanentVideoUrl })
        .eq('id', jobId),
      supabase
        .from('vision_projects')
        .update({ status: 'Completed', final_video_url: permanentVideoUrl })
        .eq('id', project_id),
    ])

    console.log(`Job ${jobId}: DONE → ${permanentVideoUrl}`)

    // ── 8. Geçici Kling videolarını Storage'dan sil (yer açmak için) ──────────
    // Kling videoları sadece Shotstack render için gerekli, sonra silinebilir.
    // Path pattern: projects/{project_id}/videos/{0-5}.mp4
    const videoStoragePaths = (video_urls ?? video_paths ?? []).map((_: unknown, i: number) => `projects/${project_id}/videos/${i}.mp4`)
    supabase.storage.from(BUCKET).remove(videoStoragePaths)
      .then(({ error }: { error: unknown }) => {
        if (error) console.warn('Storage cleanup warning:', error)
        else console.log(`Cleaned up temp Kling videos for project ${project_id}`)
      })
      .catch((e: unknown) => console.warn('Storage cleanup error (non-fatal):', e))

    // ── 9. E-posta bildirimi ──────────────────────────────────────────────────
    await sendReadyEmail(supabase, userId, project_id, permanentVideoUrl, affirmationMap)

  } catch (err) {
    await fail(String(err))
  }
}

// ─── E-posta bildirimi ────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function sendReadyEmail(supabase: any, userId: string, projectId: string, videoUrl: string, affirmationMap: Record<number, string | null> = {}) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) { console.warn('RESEND_API_KEY not set — skipping email'); return }

  try {
    // Kullanıcı e-postasını auth tablosundan al
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userData?.user?.email) {
      console.warn('Could not fetch user email:', userError?.message)
      return
    }
    const email = userData.user.email
    const resultUrl = `https://yourvision.video/result/${projectId}`

    // Enabled affirmations — up to 6, ordered
    const affirmations = Object.values(affirmationMap).filter(Boolean) as string[]

    const affirmationsSection = affirmations.length > 0 ? `
          <!-- Divider -->
          <div style="border-top:1px solid #1F1D1A;margin:36px 0 28px"></div>

          <!-- Affirmations -->
          <p style="margin:0 0 16px;font-size:11px;font-weight:500;letter-spacing:0.18em;color:#C9A961">YOUR AFFIRMATIONS</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            ${affirmations.map(a => `<tr><td style="padding:6px 0;font-size:14px;color:#C5BFB8;font-weight:300;font-style:italic;line-height:1.5">
              <span style="color:#C9A961;margin-right:10px">✦</span>${a}
            </td></tr>`).join('\n            ')}
          </table>` : ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'YourVision <hello@yourvision.video>',
        to: [email],
        subject: 'Your film is ready',
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0908;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0908;padding:48px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <!-- Logo -->
        <tr><td style="padding-bottom:40px">
          <span style="font-size:18px;font-weight:300;letter-spacing:0.06em;color:#F4F1EA">YourVision</span>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:#0F0E0C;border:1px solid #2A2520;border-radius:4px;padding:48px 40px">

          <!-- Label — hardcoded uppercase to avoid Turkish i→İ from text-transform -->
          <p style="margin:0 0 28px;font-size:11px;font-weight:500;letter-spacing:0.18em;color:#C9A961">YOUR VISION VIDEO</p>

          <h1 style="margin:0 0 20px;font-size:28px;font-weight:300;color:#F4F1EA;line-height:1.25;letter-spacing:0.02em">
            The life you named<br>is waiting to be seen.
          </h1>

          <p style="margin:0 0 36px;font-size:15px;line-height:1.8;color:#C5BFB8;font-weight:300">
            Your 60-second vision video is ready — six cinematic scenes,
            your face, the life you are moving toward.
          </p>

          <!-- CTA — hardcoded uppercase -->
          <a href="${resultUrl}"
             style="display:inline-block;padding:14px 40px;border:1px solid #C9A961;color:#C9A961;text-decoration:none;font-size:12px;font-weight:400;letter-spacing:0.14em;border-radius:4px">
            WATCH YOUR VISION
          </a>

          ${affirmationsSection}

          <!-- Divider -->
          <div style="border-top:1px solid #1F1D1A;margin:36px 0 28px"></div>

          <!-- Details -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:6px 0;font-size:13px;color:#C5BFB8;font-weight:300">
              <span style="color:#C9A961;margin-right:10px">✦</span>6 cinematic scenes — your face, your story
            </td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#C5BFB8;font-weight:300">
              <span style="color:#C9A961;margin-right:10px">✦</span>60 seconds with ambient soundtrack
            </td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#C5BFB8;font-weight:300">
              <span style="color:#C9A961;margin-right:10px">✦</span>Download in vertical format — yours to keep
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px">
          <p style="margin:0;font-size:12px;color:#4A4640;line-height:1.7;font-weight:300">
            You received this because you created a vision on
            <a href="https://yourvision.video" style="color:#6B6560;text-decoration:none">yourvision.video</a>.<br>
            Questions? <a href="mailto:hello@yourvision.video" style="color:#6B6560;text-decoration:none">hello@yourvision.video</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    })

    if (res.ok) {
      console.log(`Ready email sent to ${email}`)
    } else {
      const err = await res.text()
      console.warn(`Email send failed (${res.status}):`, err)
    }
  } catch (err) {
    console.warn('sendReadyEmail error (non-fatal):', err)
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
