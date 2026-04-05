// supabase/functions/generate-prompts/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NEGATIVE_PROMPT =
  'Multiple people, complex hand movements, walking, talking, distorted face, extra limbs'

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
      .select('id, user_id, story_inputs, selfie_url, status')
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

    const storyText = buildStoryText(project.story_inputs)
    console.log('Story text length:', storyText.length)

    // gemini-2.5-flash — current stable model
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`

    // Selfie'yi Gemini'ye görsel olarak gönder (cinsiyet/yaş/saç analizi için)
    const selfieUrl: string | null = project.selfie_url ?? null
    const contents = await buildGeminiContents(storyText, selfieUrl)

    console.log('Calling Gemini...')
    let geminiRes: Response
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 8192,
            response_mime_type: 'application/json',
          },
        }),
      })
    } catch (fetchErr) {
      console.error('Gemini fetch threw:', fetchErr)
      return json({ error: 'Gemini network error', detail: String(fetchErr) }, 502)
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

    const slots = parseSlots(rawText)
    console.log('Parsed slot count:', slots.length)

    if (slots.length !== 6) {
      return json({ error: 'Expected 6 slots from Gemini', raw: rawText.slice(0, 500) }, 502)
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

// Gemini'ye gönderilecek içerik — selfie varsa base64 inline olarak ekle
async function buildGeminiContents(storyText: string, selfieUrl: string | null) {
  const promptText = buildGeminiPrompt(storyText)

  if (!selfieUrl) {
    return [{ parts: [{ text: promptText }] }]
  }

  // Selfie'yi indir ve base64'e çevir
  try {
    const imgRes = await fetch(selfieUrl)
    if (!imgRes.ok) throw new Error(`Selfie fetch failed: ${imgRes.status}`)
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))
    const mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'

    return [{
      parts: [
        {
          text: `First, look at this selfie and note the person's:
- Gender (male/female/non-binary)
- Approximate age range (e.g. "late 20s", "mid 40s")
- Hair: color, length, style
- Skin tone

Then use these exact observations in all 6 image prompts so the generated subject matches this person.

${promptText}`,
        },
        {
          inlineData: { mimeType, data: base64 },
        },
      ],
    }]
  } catch (err) {
    console.warn('Selfie fetch for Gemini failed, proceeding without image:', err)
    return [{ parts: [{ text: promptText }] }]
  }
}

function buildGeminiPrompt(storyText: string): string {
  return `You are a cinematographer and AI prompt engineer. Transform the user's life vision into 6 unique, cinematic scenes.

Each scene needs two prompts:
1. image_prompt — for Flux (photorealistic AI image generator that composites the user's face)
2. video_prompt — for Kling (AI video generator that animates the composed image)

════════════════════════════════════════
IMAGE PROMPT RULES
════════════════════════════════════════

SUBJECT LINE (start every image_prompt with this, filling in the subject's appearance):
"A photorealistic [SHOT_TYPE] of a [GENDER], [AGE_RANGE], [HAIR_DESCRIPTION], [SKIN_TONE] subject, whose face is seamlessly composited from a reference selfie, wearing [CLOTHING] —"

Replace [SHOT_TYPE] with one of these — VARY across the 6 scenes:
- "wide establishing shot" (subject small in grand environment)
- "medium environmental shot" (subject and setting equally prominent)
- "intimate close-up" (face and upper body, emotion visible)
- "dynamic action shot" (movement, energy)
- "over-the-shoulder shot" (subject looking at something ahead)
- "golden-hour silhouette shot" (backlit, aspirational)

CONTENT RULES:
- Take the user's specific tags LITERALLY — they chose these exact things
  (e.g. "Remote Nomad" = laptop at a beach café, NOT a generic office)
- Build the scene around those specific choices
- Rich environment details: location, time of day, lighting, atmosphere, textures
- If other people appear (family, friends, partner): show them from behind, in silhouette, or at the edge of frame — faces NOT visible
- No generic stock photo feeling — make it feel like a real cinematic moment

════════════════════════════════════════
VIDEO PROMPT RULES
════════════════════════════════════════
The image is already composed. Tell Kling HOW TO MOVE the camera for 5 seconds.

GOOD examples:
- "Slow push-in toward the subject's face, morning light flickers through palm leaves"
- "Camera drifts gently right, subject gazes at the horizon, waves shimmer"
- "Subtle handheld breathing movement, golden light shifts across the subject's shoulders"
- "Rack focus from foreground detail to subject's calm expression, city blurs softly behind"

BAD (do NOT do):
- Repeat what's in the image ("person on yacht in the Mediterranean...")
- Generic words: "cinematic", "beautiful", "high quality"
- Describe action that requires new elements

Each video_prompt: 1-2 sentences, ~80-150 characters, motion/light focused.

════════════════════════════════════════
USER'S VISION (their specific choices):
---
${storyText}
---

IMPORTANT: Each of the 6 scenes must be a DIFFERENT life area from the vision above.
Use all 6 areas. No two scenes should feel similar in location, mood, or shot type.

Return ONLY a valid JSON array of exactly 6 objects. No markdown, no backticks, no explanation.
[
  { "image_prompt": "...", "video_prompt": "..." },
  ...6 total...
]`
}

type Slot = { image_prompt: string; video_prompt: string }

function parseSlots(raw: string): Slot[] {
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) cleaned = arrayMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length >= 6) {
      return parsed.slice(0, 6).map((s: unknown) => ({
        image_prompt: (s as Slot).image_prompt ?? String(s),
        video_prompt: (s as Slot).video_prompt ?? '',
      }))
    }
  } catch (e) {
    console.error('JSON.parse failed:', cleaned.slice(0, 200), e)
  }

  return []
}
