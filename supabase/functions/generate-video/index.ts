// supabase/functions/generate-video/index.ts
//
// Mimari: submit-and-return
//   1. Auth + input doğrulama
//   2. Kling task'larını sırayla submit et, task ID'lerini story_inputs.kling_tasks'a yaz
//   3. Hemen 200 dön
//   4. Processing sayfası her 30s poll-kling-tasks çağırır
//   5. poll-kling-tasks tamamlanınca generate-final-video tetikler

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE = 'https://api.piapi.ai/api/v1/task'

// ─── Entry point ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const body = await req.json()
    const project_id: string                  = body?.project_id
    const selected_ids: string[] | undefined  = body?.selected_ids
    const planFromBody: string                = body?.plan ?? 'starter'

    if (!project_id) return json({ error: 'project_id is required' }, 400)

    // ── Auth ──────────────────────────────────────────────────────────────────
    const isInternalCall =
      req.headers.get('X-Internal-Service') === 'lemonsqueezy-webhook' &&
      authHeader === `Bearer ${serviceRoleKey}`

    let resolvedUserId: string

    if (isInternalCall) {
      const bodyUserId = body?.user_id as string | undefined
      if (!bodyUserId) return json({ error: 'user_id required for internal call' }, 400)
      resolvedUserId = bodyUserId
    } else {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth:   { persistSession: false },
      })
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) return json({ error: 'Unauthorized' }, 401)
      resolvedUserId = user.id
    }

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id, story_inputs, selfie_url')
      .eq('id', project_id)
      .eq('user_id', resolvedUserId)
      .single()

    if (projectError || !project) return json({ error: 'Project not found' }, 404)

    const plan = planFromBody !== 'starter'
      ? planFromBody
      : ((project as any).story_inputs?.plan ?? 'starter')
    const videoDuration = plan === 'premium' ? 10 : 5

    // ── Fetch selected images ─────────────────────────────────────────────────
    let query = supabase
      .from('media_generations')
      .select('id, media_url, prompt_text, video_prompt, order_num')
      .eq('vision_project_id', project_id)
      .neq('media_url', '')
      .neq('media_url', 'error')
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

    // Pre-existing video slots
    const preExistingVideos: Record<number, string> = {}
    const imageOnlySlots = images.filter((img) => {
      if (isVideoUrl(img.media_url)) {
        preExistingVideos[img.order_num] = img.media_url
        return false
      }
      return true
    })

    console.log(`Submit phase: ${imageOnlySlots.length} new + ${Object.keys(preExistingVideos).length} pre-existing`)

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    // ── Submit Kling tasks sırayla ────────────────────────────────────────────
    const klingTasks: Record<string, { task_id: string; order_num: number }> = {}

    for (const img of imageOnlySlots) {
      try {
        // Signed URL oluştur — Kling public URL'lere erişemeyebilir
        let imageUrl = img.media_url
        const publicPrefix = '/object/public/vision-assets/'
        const publicIdx = img.media_url.indexOf(publicPrefix)
        if (publicIdx !== -1) {
          const storagePath = img.media_url.slice(publicIdx + publicPrefix.length).split('?')[0]
          const { data: signed } = await supabase.storage
            .from('vision-assets')
            .createSignedUrl(storagePath, 7200)
          if (signed?.signedUrl) imageUrl = signed.signedUrl
        }

        const motionPrompt = img.video_prompt?.trim()
          || 'Slow cinematic push-in, shallow depth of field, subtle atmospheric light, gentle camera drift'

        const res = await fetch(PIAPI_BASE, {
          method: 'POST',
          headers: { 'X-API-Key': piApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kling',
            task_type: 'video_generation',
            input: {
              prompt:          motionPrompt,
              negative_prompt: 'blurry, low quality, distorted, shaky, fast motion, jump cut, zoomed in too close',
              image_url:       imageUrl,
              duration:        videoDuration,
              aspect_ratio:    '9:16',
              mode:            'std',
              version:         '2.1',
              cfg_scale:       0.7,
            },
            config: { service_mode: '', without_watermark: true },
          }),
        })

        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          console.error(`Slot ${img.order_num} submit failed: HTTP ${res.status} — ${errBody}`)
          continue
        }

        const data = await res.json()
        const taskId = data?.data?.task_id
        if (!taskId) {
          console.error(`Slot ${img.order_num}: no task_id returned`)
          continue
        }

        klingTasks[img.id] = { task_id: taskId, order_num: img.order_num }
        console.log(`Slot ${img.order_num} submitted: ${taskId}`)
      } catch (err) {
        console.error(`Slot ${img.order_num} submit error:`, err)
      }
      await sleep(1000)
    }

    // ── story_inputs'a kaydet ─────────────────────────────────────────────────
    const currentInputs = (project as any).story_inputs ?? {}
    const updatedInputs = {
      ...currentInputs,
      kling_tasks:   klingTasks,
      slot_videos:   preExistingVideos,
      total_slots:   images.length,
      user_id:       resolvedUserId,
    }

    await supabase.from('vision_projects')
      .update({ status: 'Processing', story_inputs: updatedInputs })
      .eq('id', project_id)

    const submittedCount = Object.keys(klingTasks).length
    console.log(`Project ${project_id}: ${submittedCount} tasks submitted, returning immediately`)

    if (submittedCount === 0 && imageOnlySlots.length > 0) {
      // Hiç task submit edilemedi — processing page'in takılmaması için hata dön
      await supabase.from('vision_projects')
        .update({ status: 'Images_Ready' })
        .eq('id', project_id)
      return json({ error: 'All Kling submissions failed. Check PIAPI key and image URLs.' }, 500)
    }

    return json({ started: true, submitted: submittedCount })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVideoUrl(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  if (/\.(png|jpg|jpeg|webp|gif|bmp|tiff|svg)(\?|$)/.test(lower)) return false
  if (/\.(mp4|mov|webm|avi|mkv)(\?|$)/.test(lower)) return true
  return false
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
