// supabase/functions/generate-prompts/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NEGATIVE_PROMPT =
  'multiple people, crowd, group, second face, background person, stock photo, amateur photography, flat lighting, overexposed, underexposed, blurry, low quality, grainy, washed out colors, boring composition, generic, cliché, distorted face, extra limbs, watermark, text overlay, cartoon, illustration, drawing'

const CINEMATIC_SUFFIX =
  ', shot on ARRI Alexa, anamorphic lens, shallow depth of field, rich color grading, luxury lifestyle campaign, editorial photography, award-winning cinematography'

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

    // gemini-2.0-flash primary (AI Studio'da kanıtlandı — 06:10 başarılı)
    // gemini-1.5-flash/1.5-pro v1beta'da 404, gemini-2.5-flash da 404
    // 503 alınca retry yapıyoruz — 2.0-flash geçici overload durumundan kurtarır
    const geminiUrl         = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
    const geminiUrlFallback = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`

    // Kullanıcının seçtiği cinsiyet ve yaş — selfie analizi kaldırıldı (token maliyeti)
    const gender: string = (project.story_inputs as any)?.gender ?? 'male'
    const age: string    = (project.story_inputs as any)?.age ?? 'mid-30s'
    const subjectDescription = `${gender}, ${age}`
    console.log('Subject description:', subjectDescription)

    // ── Sahne prompt'ları ─────────────────────────────────────────────────────
    const contents = buildGeminiContents(storyText, sceneCount, gender, age)

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

    const urlsToTry = [
      { url: geminiUrl,         label: 'gemini-2.5-flash',      retries: 3 },
      { url: geminiUrlFallback, label: 'gemini-2.0-flash-lite', retries: 2 },
    ]

    // 429/500/502/503 → retry; diğer hatalar (400 gibi) → hemen çık
    const RETRYABLE = new Set([429, 500, 502, 503])

    outer: for (const { url, label, retries } of urlsToTry) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: geminiBody,
          })
          if (!RETRYABLE.has(res.status)) { geminiRes = res; break outer }
          const waitMs = res.status === 429 ? 5000 : 2000
          console.warn(`${label} ${res.status} — attempt ${attempt}/${retries}, retrying in ${waitMs}ms...`)
          await new Promise(r => setTimeout(r, waitMs))
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
      const errMsg = `Gemini ${geminiRes.status}: ${geminiRaw.slice(0, 300)}`
      return json({ error: errMsg }, 502)
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

    // ── Save to media_generations ─────────────────────────────────────────────
    const rows = slots.map((slot, idx) => ({
      vision_project_id: project_id,
      media_type:        'Image',
      prompt_text:       slot.image_prompt + CINEMATIC_SUFFIX,
      video_prompt:      slot.video_prompt,
      negative_prompt:   NEGATIVE_PROMPT,
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

  const geminiUrlFallback = geminiUrl.replace('gemini-2.5-flash', 'gemini-2.0-flash-lite')

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

// ── Sahne prompt'ları için Gemini içeriği ────────────────────────────────────
function buildGeminiContents(storyText: string, sceneCount: number, gender: string, age: string) {
  return [{ parts: [{ text: buildGeminiPrompt(storyText, sceneCount, gender, age) }] }]
}

function buildGeminiPrompt(storyText: string, sceneCount: number, gender: string, age: string): string {
  const genderWord = gender === 'female' ? 'woman' : 'man'
  const genderPronoun = gender === 'female' ? 'her' : 'his'

  return `You are the creative director of a luxury lifestyle film studio. Write ${sceneCount} image prompts for a hyper-cinematic personal vision film — a 30-second trailer of someone's most aspirational life. Think Lamborghini commercial meets National Geographic. Every frame must feel expensive and alive.

════════════════════════════════════════
THE SUBJECT — CRITICAL
════════════════════════════════════════
The subject is a ${genderWord}. Every prompt MUST use the word "${genderWord}" explicitly.
Life stage context (affects setting choices only, never describe age): ${age}
Body: lean, fit, athletic. Never describe body type in prompts.
Face will be composited via face-swap in post-production.

FACE VISIBILITY RULE — NON-NEGOTIABLE:
The ${genderWord}'s face MUST be visible and forward-facing (or at a slight angle) in EVERY scene.
This is required for the face-swap to work. NO back-to-camera, NO silhouettes, NO turned-away shots.
The ${genderWord} is always facing toward or slightly away from camera — face visible, expression readable.

════════════════════════════════════════
THEIR DREAM LIFE
════════════════════════════════════════
${storyText}

════════════════════════════════════════
PROMPT STRUCTURE — follow every time
════════════════════════════════════════
[ENVIRONMENT] specific textures, not generic: "rain-slicked cobblestone alley with neon reflections" not "a street"
[LIGHT] exact quality: golden hour sidelight / blue hour glow / candlelight warmth / harsh noon shadow
[CAMERA] medium shot waist-up / low angle looking up at subject / slight over-shoulder with face still visible / wide shot with subject in foreground
[SUBJECT] "a ${genderWord} standing/sitting/leaning [specific action], face [toward camera / turned slightly]"
[MOOD] one word: sovereign / electric / tender / untamed / luminous / magnetic

════════════════════════════════════════
SCENE VARIETY
════════════════════════════════════════
PRIORITY: Each scene must come directly from the person's dream life above. If they mentioned the sea, show the sea. If they mentioned family, show an intimate home. If they mentioned forests, show nature. Do NOT invent things they didn't ask for.

VARIETY rules (apply after serving their story):
- No two scenes in the same location type
- Mix: at least one outdoor, one indoor, one with water/nature if their story allows
- Mix lighting: at least one golden hour, one night/low-light scene
- Do NOT default to private jets, sports cars, or yachts unless their story specifically mentions them — these are clichés that may not fit their life

════════════════════════════════════════
FORBIDDEN
════════════════════════════════════════
- desk / office / conference / boardroom / cubicle / meeting
- furniture blocking the subject's torso
- back-to-camera / silhouette / face not visible ← this breaks face-swap
- walking or running
- close-up face portrait (keep waist-up minimum)
- teenage or child figure — the subject is an adult ${genderWord}
- multiple visible people
- wrong gender: must be a ${genderWord}, never a ${gender === 'female' ? 'man' : 'woman'} or child

════════════════════════════════════════
VIDEO PROMPT
════════════════════════════════════════
Write what MOVES and what is FELT in this 5-second clip. This drives Kling AI to animate the scene with real motion and emotion.

Include ALL of these:
1. What physically moves: clothing rippling in wind / waves rolling in / leaves trembling / light shifting across skin / smoke curling / hair lifting
2. Subject's emotional state visible in body: shoulders drop with relief / chest opens / breath visible / slight smile forming
3. Atmosphere: warm golden haze thickens / mist rolls across water / city lights blur in rain
4. One emotion word at the end: triumphant / tender / electric / sovereign / expansive / still

Good: "Shirt fabric moves in coastal wind, waves crash below frame, golden light warms across his chest, shoulders open with quiet pride — sovereign"
Bad: "slow push-in" / "cinematic pan" / "camera drifts left" / "gentle movement"

Max 150 characters.

════════════════════════════════════════
OUTPUT
════════════════════════════════════════
Return ONLY a valid JSON array of exactly ${sceneCount} objects. No markdown, no backticks.
[
  { "image_prompt": "...", "video_prompt": "..." }
]`
}

type Slot = { image_prompt: string; video_prompt: string }

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
        image_prompt: (s as Slot).image_prompt ?? String(s),
        video_prompt: (s as Slot).video_prompt ?? '',
      }))
    }
  } catch (e) {
    console.error('JSON.parse failed:', cleaned.slice(0, 200), e)
  }

  return []
}
