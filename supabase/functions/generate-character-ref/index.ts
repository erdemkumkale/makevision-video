// supabase/functions/generate-character-ref/index.ts
//
// Kullanıcının onboarding bilgilerinden tek bir karakter referans görseli üretir.
// Nötr poz, sade arka plan — sahne görselleri bu referansa göre üretilecek.
//
// Input:  { project_id, feedback? }
// Output: { image_url }  → story_inputs.character_ref_url'e kaydedilir

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIAPI_BASE  = 'https://api.piapi.ai/api/v1/task'
const PIAPI_FETCH = (id: string) => `https://api.piapi.ai/api/v1/task/${id}`
const BUCKET      = 'vision-assets'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const piApiKey       = Deno.env.get('PIAPI_API_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return json({ error: 'Unauthorized' }, 401)
    }

    const body       = await req.json()
    const project_id = body?.project_id as string
    const feedback   = body?.feedback as string | undefined

    if (!project_id) return json({ error: 'project_id required' }, 400)

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id, story_inputs, selfie_url')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) return json({ error: 'Project not found' }, 404)

    const si        = (project as any).story_inputs ?? {}
    const gender    = si.gender    ?? 'male'
    const hair      = si.hair      ?? 'short straight hair'
    const skinTone  = si.skin_tone ?? 'medium'
    const age       = si.age       ?? '30s'
    const height    = si.height    ? buildHeightDescription(si.height, si.height_unit ?? 'cm') : ''
    const story     = (si.custom_story ?? '') as string

    const genderWord = gender === 'female' ? 'woman' : gender === 'androgynous' ? 'person with androgynous features' : 'man'
    const heightDesc = height ? `, ${height}` : ''
    // "30s" → "35 years old" (Flux yaşı daha iyi yorumluyor)
    const ageMap: Record<string, string> = { '20s': '25 years old', '30s': '35 years old', '40s': '43 years old', '50s': '53 years old' }
    const ageDesc = ageMap[age] ?? age

    // Story metninden kıyafet ipucu çıkar
    const clothingStyle = inferClothingFromStory(story, gender)

    // Referans prompt: nötr, tam vücut, yüze dönük
    const basePrompt = `Studio portrait of a ${genderWord} ${ageDesc}, ${hair}, ${skinTone} skin tone${heightDesc}, wearing ${clothingStyle}, average everyday fitness level (not muscular, not athletic, normal realistic body), standing in a relaxed neutral pose, facing camera directly, slight natural expression, plain light grey studio background, soft diffused studio lighting, editorial photography, full body shot, sharp focus, high quality, realistic`

    const prompt = feedback
      ? `${basePrompt}. Minor adjustments requested (keep age accurate, do not exaggerate): ${feedback}`
      : basePrompt

    const negativePrompt = 'blurry, low quality, distorted, extra limbs, watermark, text, background clutter, dramatic pose, action scene, outfit props, elderly, old, wrinkled, aged, senior citizen, too young, teenager, muscular, athletic, bodybuilder'

    console.log(`Generating character ref for project ${project_id}`)

    // Submit Flux task
    const res = await fetch(PIAPI_BASE, {
      method: 'POST',
      headers: { 'X-API-Key': piApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Qubico/flux1-dev',
        task_type: 'txt2img',
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width:  768,
          height: 1024,
          guidance_scale: 3.5,
          seed: Math.floor(Math.random() * 2147483647),
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`Flux submit failed: ${res.status} — ${err}`)
      return json({ error: 'Image generation failed' }, 500)
    }

    const submitData = await res.json()
    const taskId     = submitData?.data?.task_id
    if (!taskId) return json({ error: 'No task_id from Flux' }, 500)

    console.log(`Character ref task submitted: ${taskId}`)

    // Poll — max 90s (18×5s)
    let imageUrl: string | null = null
    for (let i = 0; i < 18; i++) {
      await sleep(5000)
      const pollRes = await fetch(PIAPI_FETCH(taskId), { headers: { 'X-API-Key': piApiKey } })
      if (!pollRes.ok) continue
      const pollData = await pollRes.json()
      const status   = pollData?.data?.status ?? ''
      console.log(`Character ref poll ${i + 1}: ${status}`)

      if (status === 'completed') {
        imageUrl = pollData?.data?.output?.image_url ?? null
        break
      }
      if (status === 'failed') {
        console.error('Character ref task failed:', pollData?.data?.error)
        return json({ error: 'Image generation failed' }, 500)
      }
    }

    if (!imageUrl) return json({ error: 'Timed out waiting for character ref' }, 500)

    // Storage'a yükle (Flux URL expire olur)
    const fluxStoragePath = `projects/${project_id}/character-ref-flux.jpg`
    let stableFluxUrl = imageUrl
    try {
      const dlRes = await fetch(imageUrl)
      if (dlRes.ok) {
        const buffer = await dlRes.arrayBuffer()
        await supabase.storage.from(BUCKET).upload(fluxStoragePath, buffer, { contentType: 'image/jpeg', upsert: true })
        const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(fluxStoragePath)
        if (pubData?.publicUrl) stableFluxUrl = pubData.publicUrl
      }
    } catch (e) {
      console.warn('Flux storage upload failed, using Flux URL:', e)
    }

    // Faceswap — selfie yüzünü karakter referansına yapıştır
    let finalUrl = stableFluxUrl
    const selfieUrl = (project as any).selfie_url
    if (selfieUrl) {
      try {
        // Selfie için signed URL
        let selfieSignedUrl = selfieUrl
        const selfieStoragePath = selfieUrl.split('/vision-assets/')[1]?.split('?')[0]
        if (selfieStoragePath) {
          const { data: signed } = await supabase.storage.from('vision-assets').createSignedUrl(selfieStoragePath, 3600)
          if (signed?.signedUrl) selfieSignedUrl = signed.signedUrl
        }

        console.log('Submitting faceswap for character ref...')
        const fsRes = await fetch(PIAPI_BASE, {
          method: 'POST',
          headers: { 'X-API-Key': piApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'Qubico/image-toolkit',
            task_type: 'face-swap',
            input: { target_image: stableFluxUrl, swap_image: selfieSignedUrl },
          }),
        })

        if (fsRes.ok) {
          const fsData  = await fsRes.json()
          const fsTaskId = fsData?.data?.task_id
          if (fsTaskId) {
            // Poll faceswap — max 60s (12×5s)
            for (let i = 0; i < 12; i++) {
              await sleep(5000)
              const fsPoll = await fetch(PIAPI_FETCH(fsTaskId), { headers: { 'X-API-Key': piApiKey } })
              if (!fsPoll.ok) continue
              const fsPollData = await fsPoll.json()
              const fsStatus   = fsPollData?.data?.status ?? ''
              console.log(`Faceswap poll ${i + 1}: ${fsStatus}`)
              if (fsStatus === 'completed') {
                const fsUrl = fsPollData?.data?.output?.image_url ?? null
                if (fsUrl) {
                  // Faceswap sonucunu storage'a yükle
                  const fsStoragePath = `projects/${project_id}/character-ref.jpg`
                  try {
                    const fsDl = await fetch(fsUrl)
                    if (fsDl.ok) {
                      const fsBuf = await fsDl.arrayBuffer()
                      await supabase.storage.from(BUCKET).upload(fsStoragePath, fsBuf, { contentType: 'image/jpeg', upsert: true })
                      const { data: fsPub } = supabase.storage.from(BUCKET).getPublicUrl(fsStoragePath)
                      finalUrl = fsPub?.publicUrl ?? fsUrl
                    }
                  } catch (e) {
                    console.warn('Faceswap storage upload failed:', e)
                    finalUrl = fsUrl
                  }
                }
                break
              }
              if (fsStatus === 'failed') {
                console.warn('Faceswap failed, using Flux image as character ref')
                break
              }
            }
          }
        } else {
          console.warn('Faceswap submit failed, using Flux image')
        }
      } catch (e) {
        console.warn('Faceswap error, using Flux image:', e)
      }
    } else {
      console.warn('No selfie_url, skipping faceswap')
    }

    // story_inputs'a clean URL kaydet (generate-images bu URL'i kullanacak)
    await supabase.from('vision_projects')
      .update({ story_inputs: { ...si, character_ref_url: finalUrl } })
      .eq('id', project_id)

    // Frontend'e cache-busted URL dön (browser aynı URL'i cache'lemesin)
    const cacheBustedUrl = `${finalUrl}?t=${Date.now()}`
    console.log(`Character ref saved: ${finalUrl}`)
    return json({ image_url: cacheBustedUrl })

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function inferClothingFromStory(story: string, gender: string): string {
  const s = story.toLowerCase()
  const isFemale = gender === 'female'

  // Business / corporate / executive
  if (/\b(ceo|executive|board|corporate|office|business|suit|tie|professional|entrepreneur|startup|investor|meeting|conference)\b/.test(s)) {
    return isFemale ? 'a smart business suit' : 'a well-fitted suit and dress shirt'
  }
  // Luxury / wealth / formal
  if (/\b(luxury|yacht|villa|mansion|gala|red carpet|formal|elegant|designer|fashion|runway)\b/.test(s)) {
    return isFemale ? 'an elegant dress' : 'a tailored suit'
  }
  // Creative / artist / bohemian
  if (/\b(artist|paint|creative|studio|gallery|music|musician|writer|author|poet|bohemian)\b/.test(s)) {
    return isFemale ? 'stylish casual creative wear' : 'smart casual clothes, relaxed style'
  }
  // Fitness / sport / active
  if (/\b(athlete|sport|gym|fitness|marathon|yoga|outdoor|adventure|hiking|climbing)\b/.test(s)) {
    return 'smart casual athletic wear'
  }
  // Travel / explorer
  if (/\b(travel|explore|journey|world|passport|adventure|backpack)\b/.test(s)) {
    return 'smart casual travel clothes'
  }
  // Academic / intellectual
  if (/\b(professor|teacher|academic|research|university|doctor|phd|science)\b/.test(s)) {
    return isFemale ? 'smart casual clothes' : 'casual shirt and trousers'
  }

  // Default: clean casual
  return isFemale ? 'simple casual clothes, plain top and trousers' : 'simple casual clothes, plain shirt and trousers'
}

function buildHeightDescription(value: number, unit: string): string {
  if (unit === 'cm') {
    if (value < 152) return 'notably short stature'
    if (value < 195) return '' // ortalama — belirtme
    return 'notably tall stature'
  }
  if (value < 5.0) return 'notably short stature'
  if (value < 6.4) return ''
  return 'notably tall stature'
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
