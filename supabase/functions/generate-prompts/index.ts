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

    // gemini-2.5-flash — current stable model
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`

    // Selfie + referans görselleri Gemini'ye gönder
    const selfieUrl: string | null = project.selfie_url ?? null
    const refImages: Array<{ label: string; key: string; url: string }> = project.reference_images ?? []
    const contents = await buildGeminiContents(storyText, sceneCount, selfieUrl, refImages)

    console.log('Calling Gemini...')
    const geminiBody = JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
        response_mime_type: 'application/json',
      },
    })

    let geminiRes: Response
    const MAX_RETRIES = 3
    let lastFetchErr: unknown = null
    let attempt = 0
    while (attempt < MAX_RETRIES) {
      try {
        geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiBody,
        })
        if (geminiRes.status !== 503) break
        console.warn(`Gemini 503 — attempt ${attempt + 1}/${MAX_RETRIES}, retrying in 2s...`)
        await new Promise(r => setTimeout(r, 2000))
      } catch (fetchErr) {
        lastFetchErr = fetchErr
        console.error(`Gemini fetch threw (attempt ${attempt + 1}):`, fetchErr)
        await new Promise(r => setTimeout(r, 2000))
      }
      attempt++
    }

    if (!geminiRes!) {
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

    // ── Save to media_generations ─────────────────────────────────────────────
    const rows = slots.map((slot, idx) => ({
      vision_project_id: project_id,
      media_type:        'Image',
      prompt_text:       slot.image_prompt,
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

// Gemini'ye gönderilecek içerik — selfie + referans görseller base64 inline
async function buildGeminiContents(
  storyText: string,
  sceneCount: number,
  selfieUrl: string | null,
  refImages: Array<{ label: string; key: string; url: string }>,
) {
  const promptText = buildGeminiPrompt(storyText, sceneCount)

  const parts: unknown[] = []

  // Selfie analizi
  if (selfieUrl) {
    const selfiePart = await fetchImagePart(selfieUrl)
    if (selfiePart) {
      parts.push({
        text: `IMAGE 1 — SELFIE (subject's face reference):
Look carefully at this photo and determine:
1. BIOLOGICAL SEX: Is this person male or female? Look at facial structure, jawline, facial hair (beard/stubble = male), brow ridge. Be definitive — do NOT guess female if there is any facial hair.
2. HAIR: Actual hair length and color visible in the photo. Do not assume long hair.
3. AGE RANGE: Approximate age (e.g. late 20s, mid 30s).
4. SKIN TONE: Specific tone (e.g. light olive, medium brown, fair).

Use ALL of these observations in all ${sceneCount} image prompts. Never contradict what you see — if the person has a beard, they are male with short hair.`,
      })
      parts.push(selfiePart)
    }
  }

  // Referans görseller
  const loadedRefs: Array<{ label: string; part: { inlineData: { mimeType: string; data: string } } }> = []
  for (const ref of refImages) {
    const part = await fetchImagePart(ref.url)
    if (part) loadedRefs.push({ label: ref.label, part })
  }

  if (loadedRefs.length > 0) {
    parts.push({
      text: `INSPIRATION IMAGES (user's dream life references):
The following images show what the user wants in their life.
Incorporate these specific visuals into relevant scenes — place the subject IN these environments or alongside these objects.`,
    })
    loadedRefs.forEach(({ label, part }, i) => {
      parts.push({ text: `IMAGE ${(selfieUrl ? 2 : 1) + i} — ${label}:` })
      parts.push(part)
    })
  }

  // Ana prompt
  parts.push({ text: promptText })

  if (parts.length === 1) {
    // Sadece text, görsel yok
    return [{ parts }]
  }

  return [{ parts }]
}

function buildGeminiPrompt(storyText: string, sceneCount: number): string {
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
IMAGE PROMPT RULES
════════════════════════════════════════

Start every image_prompt with this subject line (fill in from selfie analysis):
"A photorealistic [SHOT_TYPE] of a [GENDER], [AGE_RANGE], [HAIR_DESCRIPTION], [SKIN_TONE] subject, whose face is composited from a reference photo, wearing [CLOTHING FITTING THE SCENE] —"

SHOT TYPES — vary across scenes to create cinematic rhythm:
- "wide establishing shot" (subject small in grand environment)
- "medium environmental shot" (subject and setting equally visible)
- "intimate close-up" (face and upper body, emotion readable)
- "over-the-shoulder shot" (subject looking at something ahead)
- "low-angle power shot" (shot from below, subject looks commanding)
- "golden-hour silhouette" (backlit, aspirational atmosphere)

VISUAL RULES:
- ONE face only — the subject is the ONLY person with a visible face
- Other people (partner, friends, team): show from behind, in silhouette, or cropped at shoulder — NO other face
- Be SPECIFIC to their vision — derive real locations, environments, activities from their description
- Rich sensory detail: lighting quality, time of day, textures, atmosphere
- Each scene should feel like a real cinematic still, not stock photography

════════════════════════════════════════
VIDEO PROMPT RULES
════════════════════════════════════════
Describe ONLY camera movement and light — never subject locomotion.

GOOD (camera + light only):
- "Slow push-in toward the subject's face, golden hour light softens across their features"
- "Camera drifts gently left, subject gazes at the view, depth of field blurs the horizon"
- "Subtle handheld breathing movement, candlelight flickers across the scene"
- "Gentle pull-back reveal, morning mist lifts slowly in the background"

FORBIDDEN — do NOT write:
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
OUTPUT
════════════════════════════════════════
Return ONLY a valid JSON array of exactly ${sceneCount} objects. No markdown, no backticks, no explanation.
[
  { "image_prompt": "...", "video_prompt": "..." },
  ... ${sceneCount} total ...
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
