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
    const project_id = body?.project_id
    if (!project_id) return json({ error: 'project_id is required' }, 400)

    const { data: project, error: projectError } = await supabase
      .from('vision_projects')
      .select('id, user_id, story_inputs, status')
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

    console.log('Calling Gemini...')
    let geminiRes: Response
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildGeminiPrompt(storyText) }] }],
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

function buildGeminiPrompt(storyText: string): string {
  return `You are both a cinematographer and an AI prompt engineer. Your job is to transform a user's life vision into 6 scenes — each with two prompts:

1. image_prompt  — for a photorealistic AI image generator (Flux) that composites the user's face into the scene
2. video_prompt  — for an AI video generator (Kling) that ANIMATES the already-composed image

────────────────────────────────────────
IMAGE PROMPT RULES
────────────────────────────────────────
- Start with: "A photorealistic medium-shot of the subject, whose face is derived from the selfie, discarding the original selfie's clothing and background."
- Describe clothing, environment, lighting, mood in rich detail
- Subject's face is the focal point, naturally lit, seamlessly composited
- Photorealistic, cinematic, medium or close-up shot
- Each scene covers a distinct life area from the user's vision

────────────────────────────────────────
VIDEO PROMPT RULES
────────────────────────────────────────
The image is already composed. The video prompt tells Kling HOW TO MOVE IT.
Think like a cinematographer giving a camera operator instructions for a 5-second shot.

GOOD video prompts:
- "Slow push-in on the subject's face, shallow depth of field, morning light flickers softly through the window"
- "Camera drifts gently left, subject exhales slowly, olive leaves sway in a faint breeze"
- "Subtle handheld sway, subject's eyes trace the horizon, waves shimmer in the distance"
- "Rack focus from the document to the subject's calm face, sunlight shifts slowly across the desk"

BAD video prompts (do NOT do this):
- Repeat the image description ("man in a boardroom with Aegean Sea view...")
- Use vague words: "cinematic", "high quality", "beautiful"
- Describe what's in the image rather than how it moves

Each video prompt should be 1-2 sentences, ~80-150 characters, motion-focused.

────────────────────────────────────────
The user's vision:
---
${storyText}
---

Return ONLY a valid JSON array of exactly 6 objects. No markdown, no backticks, no explanation.
Format:
[
  { "image_prompt": "...", "video_prompt": "..." },
  { "image_prompt": "...", "video_prompt": "..." },
  { "image_prompt": "...", "video_prompt": "..." },
  { "image_prompt": "...", "video_prompt": "..." },
  { "image_prompt": "...", "video_prompt": "..." },
  { "image_prompt": "...", "video_prompt": "..." }
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
