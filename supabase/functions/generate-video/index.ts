// supabase/functions/generate-video/index.ts
// Takes 6 face-swapped images → PiAPI Kling image-to-video (5s each, std mode)
// Stores video URLs in media_generations, sets project to Completed.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE  = 'https://api.piapi.ai/api/v1/task'
const PIAPI_FETCH = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`

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
    const body = await req.json()
    const project_id: string    = body?.project_id
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

    const piApiKey = Deno.env.get('PIAPI_API_KEY')
    if (!piApiKey) return json({ error: 'PIAPI_API_KEY not set' }, 500)

    console.log(`Generating ${images.length} videos for project ${project_id}`)

    await supabase
      .from('vision_projects')
      .update({ status: 'Processing' })
      .eq('id', project_id)

    // ── Generate videos in parallel via Kling ─────────────────────────────────
    const results = await Promise.allSettled(
      images.map((img) => generateKlingVideo(piApiKey, img))
    )

    // ── Store video URLs ──────────────────────────────────────────────────────
    const updates: Promise<unknown>[] = []
    results.forEach((result, i) => {
      const img = images[i]
      if (result.status === 'fulfilled' && result.value) {
        updates.push(
          supabase
            .from('media_generations')
            .update({ media_url: result.value })
            .eq('id', img.id)
        )
      } else {
        console.error(`Video failed for gen ${img.id}:`, (result as PromiseRejectedResult).reason)
      }
    })
    await Promise.all(updates)

    const successCount = results.filter((r) => r.status === 'fulfilled').length

    // ── Shotstack birleştirme — video URL'lerini topla ────────────────────────
    const videoUrls: string[] = []
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        videoUrls.push(result.value)
      }
    })

    if (videoUrls.length === images.length) {
      // Tüm videolar hazır: önce status'u Videos_Ready yap, sonra birleştirmeyi başlat
      await supabase
        .from('vision_projects')
        .update({ status: 'Videos_Ready' })
        .eq('id', project_id)

      // generate-final-video'yu çağır (Shotstack ile birleştirme + müzik)
      // Hemen job_id döner, arka planda çalışır
      const finalVideoFn = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-final-video`
      fetch(finalVideoFn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          project_id,
          user_id:    user.id,
          video_urls: videoUrls,
        }),
      }).catch((e) => console.error('generate-final-video trigger error:', e))

      console.log(`Shotstack birleştirme başlatıldı: ${videoUrls.length} video`)
    } else {
      // Bazı videolar başarısız: yine de Completed yapıyoruz (bireysel videolar görünür)
      await supabase
        .from('vision_projects')
        .update({ status: 'Completed' })
        .eq('id', project_id)
    }

    return json({ success: true, generated: successCount, total: images.length })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

// ─── Kling image-to-video ─────────────────────────────────────────────────────

async function generateKlingVideo(
  apiKey: string,
  img: { id: string; media_url: string; prompt_text: string; video_prompt?: string },
): Promise<string> {
  // Use the dedicated video_prompt if available, otherwise fall back to a generic motion prompt
  const motionPrompt = img.video_prompt?.trim()
    || `Slow cinematic push-in, shallow depth of field, subtle atmospheric light, gentle camera drift`

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
        mode:            'std',        // standard — cost-controlled
        version:         '2.1',
        cfg_scale:       0.5,
      },
      config: { service_mode: '' },
    }),
  })

  if (!res.ok) throw new Error(`Kling submit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Kling: no task_id: ${JSON.stringify(data)}`)

  console.log(`Kling task submitted: ${taskId}`)

  // Poll up to 30 attempts × 10s = 5 minutes
  return await pollTask(apiKey, taskId, 30, 10000)
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
