// supabase/functions/generate-prompts/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NEGATIVE_PROMPT =
  'Multiple visible faces, second person facing camera, crowd, group shot, background face, two faces, distorted face, extra limbs, complex hand movements, watermark, text overlay'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Kullanıcı token'ını doğrula — anon key + kullanıcının Authorization header'ı
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth:   { persistSession: false },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    // DB işlemleri için service role client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // ── Input ─────────────────────────────────────────────────────────────────
    const body = await req.json()
    const project_id = body?.project_id
    if (!project_id) return json({ error: 'project_id is required' }, 400)

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id, story_inputs, selfie_url, reference_images, status')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      console.error('Project fetch error:', projectError)
      return json({ error: 'Project not found' }, 404)
    }

    // ── Gemini ────────────────────────────────────────────────────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) return json({ error: 'GEMINI_API_KEY not set' }, 500)

    const storyText  = buildStoryText(project.story_inputs)
    const sceneCount = (project.story_inputs as any)?.scene_count ?? 6
    console.log('Story text length:', storyText.length, '| scene count:', sceneCount)

    // gemini-2.5-flash önce, 503'te 1.5-flash'a düş
    const geminiUrl     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
    const geminiUrlFallback = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`

    const selfieUrl: string | null = project.selfie_url ?? null
    const refImages: Array<{ label: string; key: string; url: string }> = project.reference_images ?? []
    const availableRefs = refImages.map(r => r.key)

    // Kullanıcının seçtiği cinsiyet ve yaş
    const gender: string = (project.story_inputs as any)?.gender ?? 'male'
    const age: string    = (project.story_inputs as any)?.age ?? 'mid-30s'

    // ── ADIM 1: Selfie'den sadece saç ve ten analizi ──────────────────────────
    let hairAndSkin = 'short dark hair, medium skin tone' // fallback
    if (selfieUrl) {
      console.log('Step 1: Analyzing selfie for hair & skin...')
      hairAndSkin = await analyzeHairAndSkin(geminiUrl, selfieUrl)
      console.log('Hair & skin:', hairAndSkin)
    }

    const subjectDescription = `${gender}, ${age}, ${hairAndSkin}`
    console.log('Subject description:', subjectDescription)

    // ── ADIM 2: Sahne prompt'ları ─────────────────────────────────────────────
    const contents = buildGeminiContents(storyText, sceneCount, subjectDescription, availableRefs)

    console.log('Step 2: Calling Gemini for scene prompts...')
    const geminiBody = JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
        response_mime_type: 'application/json',
      },
    })

    let geminiRes: Response | undefined
    let lastFetchErr: unknown = null

    // 2.5-flash: 2 deneme → başarısız olursa 1.5-flash: 2 deneme
    const urlsToTry = [
      { url: geminiUrl,         label: 'gemini-2.5-flash', retries: 2 },
      { url: geminiUrlFallback, label: 'gemini-1.5-flash', retries: 2 },
    ]

    outer: for (const { url, label, retries } of urlsToTry) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiBody,
          })
          if (res.status !== 503) { geminiRes = res; break outer }
          console.warn(`${label} 503 — attempt ${attempt}/${retries}, retrying in 2s...`)
          await new Promise(r => setTimeout(r, 2000))
        } catch (fetchErr) {
          lastFetchErr = fetchErr
          console.error(`${label} fetch threw (attempt ${attempt}):`, fetchErr)
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      console.warn(`${label} exhausted, trying fallback...`)
    }

    if (!geminiRes) {
      return json({ error: 'Gemini network error', detail: String(lastFetchErr) }, 502)
    }

    console.log('Gemini HTTP status:', geminiRes.status)

    const geminiRaw = await geminiRes.text()
    console.log('Gemini raw response:', geminiRaw.slice(0, 500))

    if (!geminiRes.ok) {
      return json({ error: 'Gemini API failed', status: geminiRes.status, detail: geminiRaw }, 502)
    }

    let geminiData: Record<string, unknown>
    try {
      geminiData = JSON.parse(geminiRaw)
    } catch (parseErr) {
      console.error('Gemini JSON parse error:', parseErr)
      return json({ error: 'Gemini response not valid JSON', raw: geminiRaw.slice(0, 300) }, 502)
    }

    const rawText: string =
      (geminiData as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    console.log('Gemini extracted text:', rawText.slice(0, 300))

    const slots = parseSlots(rawText, sceneCount)
    console.log('Parsed slot count:', slots.length, '| expected:', sceneCount)

    if (slots.length !== sceneCount) {
      return json({ error: `Expected ${sceneCount} slots from Gemini, got ${slots.length}`, raw: rawText.slice(0, 500) }, 502)
    }

    // reference_key varsa o sahne için referans görsel URL'sini bul
    const refImageMap: Record<string, string> = {}
    for (const r of refImages) refImageMap[r.key] = r.url

    // ── Save to media_generations ─────────────────────────────────────────────
    const rows = slots.map((slot, idx) => ({
      vision_project_id: project_id,
      media_type:        'Image',
      prompt_text:       slot.image_prompt,
      video_prompt:      slot.video_prompt,
      negative_prompt:   NEGATIVE_PROMPT,
      reference_image_url: slot.reference_key ? (refImageMap[slot.reference_key] ?? null) : null,
      media_url:         '',
      is_selected:       false,
      revision_count:    0,
      order_num:         idx,
      is_redo:           false,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('media_generations')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('media_generations insert error:', insertError)
      return json({ error: insertError.message }, 500)
    }

    await supabase
      .from('vision_projects')
      .update({ status: 'Images_Ready' })
      .eq('id', project_id)

    console.log('Done — inserted', inserted?.length, 'rows')
    return json({ success: true, generations: inserted })

  } catch (err: unknown) {
    const e = err as Error
    console.error('UNHANDLED ERROR:', e?.message, e?.stack)
    return json({ error: e?.message ?? 'Unknown error', stack: e?.stack ?? '' }, 500)
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function buildStoryText(storyInputs: Record<string, unknown>): string {
  if (!storyInputs) return 'A fulfilling, abundant life.'

  // Legacy: plain custom_story string
  if (typeof (storyInputs as any).custom_story === 'string') {
    return (storyInputs as any).custom_story
  }

  // New format: { [areaKey]: { tags: string[], custom: string } }
  const areaKeys = ['career', 'relationships', 'health', 'wealth', 'personal_growth', 'adventure']
  const areaLabels: Record<string, string> = {
    career: 'Career', relationships: 'Relationships', health: 'Health',
    wealth: 'Wealth', personal_growth: 'Personal Growth', adventure: 'Adventure',
  }

  const lines: string[] = []
  areaKeys.forEach((key) => {
    const entry = (storyInputs as any)[key]
    if (!entry) return
    const parts: string[] = []
    if (Array.isArray(entry.tags) && entry.tags.length > 0) {
      parts.push(entry.tags.join(', '))
    }
    if (typeof entry.custom === 'string' && entry.custom.trim()) {
      parts.push(entry.custom.trim())
    }
    if (parts.length > 0) {
      lines.push(`${areaLabels[key]}: ${parts.join(' — ')}`)
    }
  })

  // Legacy fallback: plain string values per key
  if (lines.length === 0) {
    areaKeys.forEach((key) => {
      const val = (storyInputs as any)[key]
      if (typeof val === 'string' && val.trim()) {
        lines.push(`${areaLabels[key]}: ${val.trim()}`)
      }
    })
  }

  return lines.length ? lines.join('\n') : 'A fulfilling, abundant life.'
}

// Görsel URL'yi indir → base64 part'a çevir
async function fetchImagePart(url: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
    return { inlineData: { mimeType, data: base64 } }
  } catch {
    return null
  }
}

// ── Adım 1: Selfie'den sadece saç rengi/uzunluğu ve ten analizi ──────────────
async function analyzeHairAndSkin(geminiUrl: string, selfieUrl: string): Promise<string> {
  const selfiePart = await fetchImagePart(selfieUrl)
  if (!selfiePart) return 'short dark hair, medium skin tone'

  const geminiUrlFallback = geminiUrl.replace('gemini-2.5-flash', 'gemini-1.5-flash')

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: `Look at this photo and return ONLY two things, comma-separated, no extra text:
1. Hair: actual length (short/medium/long) and color visible in the photo
2. Skin tone: specific description (e.g. "light olive", "fair", "medium brown", "dark")

Example output: short dark brown hair, light olive skin` },
        selfiePart,
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 30 },
  })

  for (const url of [geminiUrl, geminiUrlFallback]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
      console.log('Hair & skin raw:', text)
      if (text) return text
    } catch (e) {
      console.error('Hair & skin analysis failed:', e)
    }
  }
  return 'short dark hair, medium skin tone'
}

// ── Adım 2: Sahne prompt'ları için Gemini içeriği ─────────────────────────────
function buildGeminiContents(
  storyText: string,
  sceneCount: number,
  subjectDescription: string,
  availableRefs: string[],
) {
  const promptText = buildGeminiPrompt(storyText, sceneCount, subjectDescription, availableRefs)
  return [{ parts: [{ text: promptText }] }]
}

function buildGeminiPrompt(storyText: string, sceneCount: number, subjectDescription: string, availableRefs: string[] = []): string {
  // Narrative arc — sahne sayısına göre dinamik yapı
  const mid = sceneCount - 2
  const arcDescription = sceneCount <= 6
    ? `Scene 1: Opening (who they are becoming — establishing shot)
Scene 2–${mid}: Dream life moments (varied locations, moods, activities from their vision)
Scene ${sceneCount - 1}: Peak / most powerful moment (emotional climax)
Scene ${sceneCount}: Closing (peaceful, triumphant — pulls back to reveal the full picture)`
    : `Scene 1: Opening (who they are becoming — wide establishing shot)
Scene 2–3: World-building (environments and settings from their dream life)
Scene 4–${mid}: Dream life moments (key activities, relationships, achievements)
Scene ${sceneCount - 1}: Peak / most powerful moment (emotional climax)
Scene ${sceneCount}: Closing (peaceful, hopeful — camera pulls back)`

  return `You are a cinematographer creating a personal vision film — a short cinematic trailer of someone's dream life.

Your task: generate ${sceneCount} scenes that together form a cohesive short film.
The scenes should feel CONNECTED — like acts in a movie trailer, not random separate images.

════════════════════════════════════════
FILM STRUCTURE (follow this arc)
════════════════════════════════════════
${arcDescription}

════════════════════════════════════════
CRITICAL PROMPT RULES
════════════════════════════════════════
1. ALWAYS establish the environment first. Never start with the subject. The world comes before the person.
2. The subject enters the scene naturally — they belong there, they were not placed there.
3. Every image_prompt MUST include:
   - Camera angle: wide shot / medium shot / over-the-shoulder / back to camera / silhouette
   - Lighting and time of day (e.g. golden hour, blue hour, overcast midday, candlelight)
   - Emotional atmosphere (one word: triumphant, peaceful, electric, intimate, grounded...)
4. NEVER describe a portrait. NEVER frame the face as the focal point.
5. The subject is described below — weave them naturally into the scene, do not open with them.

THE SUBJECT (use naturally within the scene):
${subjectDescription}, face composited from a reference photo

VISUAL RULES:
- ONE face only — the subject is the ONLY person with a visible face
- Other people: show from behind, in silhouette, or cropped — NO other face
- Rich sensory detail: light quality, textures, atmosphere
- Each scene should feel like a real cinematic still, not stock photography

════════════════════════════════════════
VIDEO PROMPT RULES
════════════════════════════════════════
Describe ONLY camera movement and light — never subject locomotion.

GOOD:
- "Slow push-in, golden hour light softens across the terrace"
- "Camera drifts gently left, depth of field blurs the horizon"
- "Subtle handheld breathing movement, candlelight flickers"
- "Gentle pull-back reveal, morning mist lifts in the background"

FORBIDDEN:
- Subject moving: walking, turning, driving, riding, gesturing
- New objects or people appearing
- Restating what's in the image
- Vague words: "cinematic", "beautiful", "epic", "stunning"

Each video_prompt: 1–2 sentences, 80–140 characters max.

════════════════════════════════════════
THEIR DREAM LIFE
════════════════════════════════════════
${storyText}

════════════════════════════════════════
REFERENCE IMAGES
════════════════════════════════════════
${availableRefs.length > 0
  ? `The user has uploaded reference images for: ${availableRefs.join(', ')}.

These are part of the world — weave them naturally into scenes.
The dream home appears in the background. The car passes through a scene. They are environment, not subject.

MANDATORY: Each uploaded reference [${availableRefs.join(', ')}] must appear in at least one scene.

Assign each scene a "reference_key" field:
- Use the exact key when that reference is the environment of the scene
- Use null for scenes that don't feature a reference
- Spread references — don't cluster them
- "home": scene takes place IN or AROUND the dream home
- "car": dream car is visible IN or AROUND the scene
- "location": scene is SET AT the dream location
- "lifestyle": scene reflects that specific lifestyle`
  : `The user has not uploaded any reference images. Set "reference_key": null for all scenes.`}

════════════════════════════════════════
OUTPUT
════════════════════════════════════════
Return ONLY a valid JSON array of exactly ${sceneCount} objects. No markdown, no backticks, no explanation.
[
  { "image_prompt": "...", "video_prompt": "...", "reference_key": null },
  ... ${sceneCount} total ...
]`
}

type Slot = { image_prompt: string; video_prompt: string; reference_key: string | null }

function parseSlots(raw: string, sceneCount = 6): Slot[] {
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) cleaned = arrayMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length >= sceneCount) {
      return parsed.slice(0, sceneCount).map((s: unknown) => ({
        image_prompt:  (s as Slot).image_prompt ?? String(s),
        video_prompt:  (s as Slot).video_prompt ?? '',
        reference_key: (s as Slot).reference_key ?? null,
      }))
    }
  } catch (e) {
    console.error('JSON.parse failed:', cleaned.slice(0, 200), e)
  }

  return []
}
