// src/lib/api.js
// Calls Supabase Edge Functions directly via supabase.functions.invoke()
// This goes browser → Supabase directly, bypassing any Vercel/Next.js proxy
// and avoiding the 10-second serverless timeout entirely.

import { supabase } from '../supabaseClient'

async function invokeFunction(name, body) {
  // Always get a fresh session — auto-refreshes if the JWT is expired
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('Session expired. Please sign in again.')
  }
  const token = sessionData.session.access_token

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error) {
    // Extract the real error body from the response context
    let detail = error.message ?? `Function ${name} failed`
    try {
      if (error.context?.text) {
        const text = await error.context.text()
        const parsed = JSON.parse(text)
        detail = parsed.error ?? parsed.message ?? text
      }
    } catch (_) { /* ignore parse errors */ }
    console.error(`[api] ${name} error (${error.context?.status ?? '?'}):`, detail)
    throw new Error(detail)
  }
  return data
}

export const api = {
  generatePrompts: (projectId) =>
    invokeFunction('generate-prompts', { project_id: projectId }),

  // Fire-and-forget — returns immediately, pipeline runs in background
  startGeneration: (projectId) =>
    invokeFunction('generate-images', { project_id: projectId, phase: 'all' }),

  generateFlux: (projectId) =>
    invokeFunction('generate-images', { project_id: projectId, phase: 'flux' }),

  generateFaceswap: (projectId, fluxSlots) =>
    invokeFunction('generate-images', { project_id: projectId, phase: 'faceswap', flux_slots: fluxSlots }),

  redoImage: (generationId, feedback) =>
    invokeFunction('redo-image', { generation_id: generationId, feedback }),

  // selected_ids: array of generation IDs (the V1/V2 choices per slot)
  generateVideo: (projectId, selectedIds, plan = 'starter') =>
    invokeFunction('generate-video', { project_id: projectId, selected_ids: selectedIds, plan }),

  // Async full pipeline — returns { job_id } immediately, pipeline runs in background.
  // Frontend polls video_jobs table by job_id or vision_project_id.
  generateFullVideo: (projectId, userId, selfieUrl, prompts, audioPrompt) =>
    invokeFunction('generate-full-video', {
      project_id:   projectId,
      user_id:      userId,
      selfie_url:   selfieUrl,
      prompts,
      audio_prompt: audioPrompt,
    }),

  // Montaj fonksiyonu — Kling/Udio çalıştırmaz.
  // Mod A: videoPaths (storage path'leri) → signed URL üretilir
  // Mod B: videoUrls (hazır URL'ler) → direkt kullanılır
  generateFinalVideo: (projectId, userId, { videoPaths, videoUrls } = {}) =>
    invokeFunction('generate-final-video', {
      project_id:  projectId,
      user_id:     userId,
      ...(videoPaths ? { video_paths: videoPaths } : {}),
      ...(videoUrls  ? { video_urls:  videoUrls  } : {}),
    }),
}
