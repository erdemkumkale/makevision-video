// src/lib/api.js
// Calls Supabase Edge Functions directly via supabase.functions.invoke()
// This goes browser → Supabase directly, bypassing any Vercel/Next.js proxy
// and avoiding the 10-second serverless timeout entirely.

import { supabase } from '../supabaseClient'

async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
  })
  if (error) {
    console.error(`[api] ${name} error:`, error)
    throw new Error(error.message ?? `Function ${name} failed`)
  }
  return data
}

export const api = {
  generatePrompts: (projectId) =>
    invokeFunction('generate-prompts', { project_id: projectId }),

  generateImages: (projectId) =>
    invokeFunction('generate-images', { project_id: projectId }),

  redoImage: (generationId, feedback) =>
    invokeFunction('redo-image', { generation_id: generationId, feedback }),

  // selected_ids: array of generation IDs (the V1/V2 choices per slot)
  generateVideo: (projectId, selectedIds) =>
    invokeFunction('generate-video', { project_id: projectId, selected_ids: selectedIds }),

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
