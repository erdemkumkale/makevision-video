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

    const prompts = parsePrompts(rawText)
    console.log('Parsed prompt count:', prompts.length)

    if (prompts.length !== 6) {
      return json({ error: 'Expected 6 prompts from Gemini', raw: rawText.slice(0, 500) }, 502)
    }

    // ── Save to media_generations ─────────────────────────────────────────────
    const rows = prompts.map((promptText, idx) => ({
      vision_project_id: project_id,
      media_type:        'Image',
      prompt_text:       promptText,
      negative_prompt:   NEGATIVE_PROMPT,
      media_url:         '',
      is_selected:       false,
      revision_count:    0,
      order_num:         idx,   // 0-5, stable slot identifier
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
  return `You are an expert prompt engineer for Magic Hour's AI image generation API. Your goal is to convert a user's vision into 6 highly-descriptive, photorealistic image prompts that blend the user's face (from their selfie) seamlessly into each new scene.

CRITICAL REQUIREMENT FOR BLENDING:
You MUST instruct Magic Hour to DISCARD the original selfie's clothing and background entirely. Replace them with clothing and environment that are fully appropriate for the vision scene.

Do NOT write: "A photo of the person from the selfie in space."
DO write: "A photorealistic medium-shot of the subject, whose face is derived from the selfie, wearing a pristine white SpaceX astronaut suit. They are floating elegantly in the silent void of space, with the cosmic dust and distant galaxies of the Milky Way forming a vibrant, deep blue and orange background. Soft, cool lighting from the stars illuminates their face. Cinematic, highly detailed, seamless face blend."

Each of the 6 prompts MUST:
- Explicitly describe new clothing/outfit suited to the scene (never reference the selfie's original clothes)
- Describe the environment, lighting, mood, and atmosphere in rich visual detail
- Feature the subject's face as the clear focal point, naturally lit and seamlessly composited
- Be photorealistic, cinematic, medium or close-up shot
- Represent a distinct moment or life area from the user's vision, ordered to build a visual narrative

The user's vision:
---
${storyText}
---

You MUST return ONLY a valid JSON array of exactly 6 strings. No markdown, no backticks, no code fences, no explanation — just the raw JSON array.
Example: ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6"]`
}

function parsePrompts(raw: string): string[] {
  // Strip any markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Extract just the JSON array if there's surrounding text
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) cleaned = arrayMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length >= 6) {
      return parsed.slice(0, 6).map(String)
    }
  } catch (e) {
    console.error('JSON.parse failed on cleaned text:', cleaned.slice(0, 200), e)
  }

  // Last resort: pull out quoted strings longer than 20 chars
  const matches = raw.match(/"([^"]{20,})"/g)
  if (matches && matches.length >= 6) {
    return matches.slice(0, 6).map((s) => s.replace(/^"|"$/g, ''))
  }

  return []
}
