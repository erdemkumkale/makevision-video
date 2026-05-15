// supabase/functions/poll-kling-tasks/index.ts
//
// Processing sayfası tarafından her 30 saniyede çağrılır.
// Pending Kling task'ları bir kez kontrol eder (loop yok — timeout riski yok).
// Tamamlananları storage'a yükler, story_inputs'u günceller.
// Tüm task'lar bitince generate-final-video tetikler.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_FETCH = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`
const BUCKET = 'vision-assets'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const piApiKey       = Deno.env.get('PIAPI_API_KEY')!

    // Auth — kullanıcı veya internal service
    const isInternal = authHeader === `Bearer ${serviceRoleKey}`
    let resolvedUserId: string | null = null

    if (!isInternal) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth:   { persistSession: false },
      })
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) return json({ error: 'Unauthorized' }, 401)
      resolvedUserId = user.id
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const body = await req.json()
    const project_id: string = body?.project_id
    if (!project_id) return json({ error: 'project_id is required' }, 400)

    // ── Projeyi yükle ─────────────────────────────────────────────────────────
    const projectQuery = supabase
      .from('vision_projects')
      .select('id, user_id, story_inputs, status')
      .eq('id', project_id)

    if (resolvedUserId) projectQuery.eq('user_id', resolvedUserId)

    const { data: project, error: projectError } = await projectQuery.single()
    if (projectError || !project) return json({ error: 'Project not found' }, 404)

    const storyInputs = (project as any).story_inputs ?? {}
    const klingTasks: Record<string, { task_id: string; order_num: number }> = storyInputs.kling_tasks ?? {}
    const slotVideos: Record<number, string> = storyInputs.slot_videos ?? {}
    const totalSlots: number = storyInputs.total_slots ?? 6
    const userId: string = storyInputs.user_id ?? project.user_id

    const pendingCount = Object.keys(klingTasks).length
    console.log(`Project ${project_id}: ${pendingCount} pending tasks, ${Object.keys(slotVideos).length} done`)

    if (pendingCount === 0) {
      // Hiç pending task yok. Eğer story_inputs.slot_videos da boşsa ama
      // media_generations'da video URL'leri varsa (eski generate-video'dan kalan),
      // onları rescue et ve generate-final-video tetikle.
      if (Object.keys(slotVideos).length === 0 && project.status === 'Processing') {
        const { data: videoRows } = await supabase
          .from('media_generations')
          .select('order_num, media_url')
          .eq('vision_project_id', project_id)
          .eq('is_selected', true)

        const rescuedVideos: Record<number, string> = {}
        for (const row of videoRows ?? []) {
          if (isVideoUrl(row.media_url)) rescuedVideos[row.order_num] = row.media_url
        }

        const rescuedCount = Object.keys(rescuedVideos).length
        console.log(`Rescue check: ${rescuedCount} video(s) found in media_generations`)

        if (rescuedCount > 0 && rescuedCount === totalSlots) {
          // Tüm slot'lar hazır — Shotstack tetikle
          const videoUrls = Object.entries(rescuedVideos)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, url]) => url)

          await supabase.from('vision_projects')
            .update({ status: 'Videos_Ready', story_inputs: { ...storyInputs, slot_videos: rescuedVideos } })
            .eq('id', project_id)

          const finalVideoFn = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-final-video`
          try {
            const r = await fetch(finalVideoFn, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({ project_id, user_id: userId, video_urls: videoUrls }),
            })
            console.log(`Rescue: generate-final-video triggered: HTTP ${r.status}`)
          } catch (e) {
            console.error('Rescue: generate-final-video trigger error:', e)
          }
          return json({ pending: 0, completed: rescuedCount, done: true, rescued: true })
        }

        if (rescuedCount > 0 && rescuedCount < totalSlots) {
          // Kısmi tamamlama — kalan görsel slot'ları için Kling task submit et
          console.log(`Rescue: ${rescuedCount}/${totalSlots} videos done, submitting remaining image slots to Kling`)

          const { data: imageRows } = await supabase
            .from('media_generations')
            .select('id, order_num, media_url, video_prompt')
            .eq('vision_project_id', project_id)
            .eq('is_selected', true)

          const newKlingTasks: Record<string, { task_id: string; order_num: number }> = {}

          for (const row of imageRows ?? []) {
            if (isVideoUrl(row.media_url)) continue // zaten video var
            if (!row.media_url || row.media_url === 'error') continue // geçersiz

            try {
              const motionPrompt = row.video_prompt?.trim()
                || 'Slow cinematic push-in, shallow depth of field, subtle atmospheric light, gentle camera drift'

              const res = await fetch('https://api.piapi.ai/api/v1/task', {
                method: 'POST',
                headers: { 'X-API-Key': piApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'kling',
                  task_type: 'video_generation',
                  input: {
                    prompt: motionPrompt,
                    negative_prompt: 'blurry, low quality, distorted, shaky, fast motion, jump cut, zoomed in too close',
                    image_url: row.media_url,
                    duration: 5,
                    aspect_ratio: '9:16',
                    mode: 'std',
                    version: '2.1',
                    cfg_scale: 0.7,
                  },
                  config: { service_mode: '', without_watermark: true },
                }),
              })

              if (res.ok) {
                const data = await res.json()
                const taskId = data?.data?.task_id
                if (taskId) {
                  newKlingTasks[row.id] = { task_id: taskId, order_num: row.order_num }
                  console.log(`Rescue: slot ${row.order_num} submitted: ${taskId}`)
                }
              } else {
                const errBody = await res.text().catch(() => '')
                console.error(`Rescue: slot ${row.order_num} submit failed: HTTP ${res.status} — ${errBody}`)
              }
            } catch (err) {
              console.error(`Rescue: slot ${row.order_num} submit error:`, err)
            }
          }

          if (Object.keys(newKlingTasks).length > 0) {
            const newStoryInputs = {
              ...storyInputs,
              kling_tasks: newKlingTasks,
              slot_videos: rescuedVideos,
              total_slots: totalSlots,
              user_id: userId,
            }
            await supabase.from('vision_projects')
              .update({ story_inputs: newStoryInputs })
              .eq('id', project_id)
            console.log(`Rescue: ${Object.keys(newKlingTasks).length} new tasks saved, polling will continue`)
            return json({ pending: Object.keys(newKlingTasks).length, completed: rescuedCount, done: false, rescued: true })
          }
        }
      }

      return json({ pending: 0, completed: Object.keys(slotVideos).length, done: true })
    }

    // ── Her pending task'ı bir kez kontrol et (loop değil) ───────────────────
    const updatedKlingTasks = { ...klingTasks }
    const updatedSlotVideos = { ...slotVideos }

    await Promise.all(
      Object.entries(klingTasks).map(async ([genId, { task_id, order_num }]) => {
        try {
          const res = await fetch(PIAPI_FETCH(task_id), {
            headers: { 'X-API-Key': piApiKey },
          })

          if (!res.ok) {
            console.warn(`Task ${task_id} (slot ${order_num}): HTTP ${res.status}`)
            return
          }

          const data = await res.json()
          const status: string = data?.data?.status ?? ''
          console.log(`Task ${task_id} (slot ${order_num}): ${status}`)

          if (status === 'completed') {
            const videoUrl = data?.data?.output?.video_url
              ?? data?.data?.output?.url
              ?? data?.data?.output?.video

            if (!videoUrl) {
              console.error(`Task ${task_id}: completed but no video URL`)
              delete updatedKlingTasks[genId]
              return
            }

            // Content-type kontrolü — Kling bazen "completed" deyip image döndürür
            try {
              const headRes = await fetch(videoUrl, { method: 'HEAD' })
              const ct = headRes.headers.get('content-type') ?? ''
              if (ct.startsWith('image/')) {
                console.error(`Task ${task_id}: image content-type (${ct}) — Kling failure, skipping slot`)
                delete updatedKlingTasks[genId]
                return
              }
            } catch (_) { /* HEAD check non-fatal */ }

            // Storage'a yükle
            const storagePath = `projects/${project_id}/videos/${order_num}.mp4`
            try {
              const dlRes = await fetch(videoUrl)
              if (dlRes.ok) {
                const buffer = await dlRes.arrayBuffer()
                await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })
                const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
                const stableUrl = pubData?.publicUrl ?? videoUrl
                updatedSlotVideos[order_num] = stableUrl
                console.log(`Slot ${order_num} video saved: ${storagePath}`)
              } else {
                updatedSlotVideos[order_num] = videoUrl // fallback: Kling URL
              }
            } catch (uploadErr) {
              console.warn(`Slot ${order_num} upload failed, using Kling URL:`, uploadErr)
              updatedSlotVideos[order_num] = videoUrl
            }

            delete updatedKlingTasks[genId]

          } else if (status === 'failed') {
            console.error(`Task ${task_id} (slot ${order_num}) failed:`, data?.data?.error)
            delete updatedKlingTasks[genId]
            // Bu slot filmde olmayacak — diğerlerini bekleriz
          }
          // pending / processing → bir sonraki poll'da tekrar kontrol edilir

        } catch (err) {
          console.error(`Task ${task_id} poll error:`, err)
        }
      })
    )

    // ── story_inputs'u güncelle ───────────────────────────────────────────────
    const newStoryInputs = {
      ...storyInputs,
      kling_tasks: updatedKlingTasks,
      slot_videos: updatedSlotVideos,
    }

    const remainingPending = Object.keys(updatedKlingTasks).length
    const completedCount   = Object.keys(updatedSlotVideos).length

    if (remainingPending === 0 && pendingCount > 0) {
      // Tüm task'lar tamamlandı — Shotstack tetikle
      console.log(`All tasks done: ${completedCount} videos ready, triggering generate-final-video`)

      const videoUrls = Object.entries(updatedSlotVideos)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, url]) => url)

      if (videoUrls.length > 0) {
        await supabase.from('vision_projects')
          .update({ status: 'Videos_Ready', story_inputs: newStoryInputs })
          .eq('id', project_id)

        // generate-final-video tetikle
        const finalVideoFn = `${supabaseUrl}/functions/v1/generate-final-video`
        try {
          const triggerRes = await fetch(finalVideoFn, {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ project_id, user_id: userId, video_urls: videoUrls }),
          })
          console.log(`generate-final-video triggered: HTTP ${triggerRes.status}`)
        } catch (e) {
          console.error('generate-final-video trigger error:', e)
        }
      } else {
        // Hiç video üretilemedi
        await supabase.from('vision_projects')
          .update({ status: 'Images_Ready', story_inputs: newStoryInputs })
          .eq('id', project_id)
      }

      return json({ pending: 0, completed: completedCount, done: true })
    }

    // Hâlâ bekleyen task'lar var
    await supabase.from('vision_projects')
      .update({ story_inputs: newStoryInputs })
      .eq('id', project_id)

    return json({ pending: remainingPending, completed: completedCount, done: false })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

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
