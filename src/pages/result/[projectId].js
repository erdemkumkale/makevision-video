import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Result() {
  const router              = useRouter()
  const { projectId, video } = router.query
  const { user }            = useAuth()

  const [videoUrl, setVideoUrl] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!projectId || !user) return

    const load = async () => {
      // video URL comes from query param (set by processing page)
      // Fallback: fetch directly from DB in case user lands here directly
      if (video) {
        setVideoUrl(decodeURIComponent(video))
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('vision_projects')
        .select('final_video_url, status')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        router.replace('/dashboard')
        return
      }

      if (data.final_video_url) {
        setVideoUrl(data.final_video_url)
        setLoading(false)
      } else if (data.status === 'Processing' || data.status === 'Videos_Ready') {
        // Still processing — send them back to the waiting screen
        router.replace(`/processing/${projectId}`)
      } else {
        router.replace('/dashboard')
      }
    }

    load()
  }, [projectId, video, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <span className="text-glow-soft font-semibold tracking-wide text-sm">
            MakeVision<span className="text-gray-500">.video</span>
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 animate-fade-in">
        {/* Heading */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full
                          bg-glow-dim/30 border border-glow-dim shadow-glow mb-6">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-3xl font-semibold text-white leading-tight">
            Your Vision Is <span className="text-glow-soft">Alive</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            A cinematic portrait of the life you&apos;re stepping into.
          </p>
        </div>

        {/* Video player */}
        {videoUrl && (
          <div className="w-full max-w-xs mx-auto mb-8 animate-slide-up rounded-2xl overflow-hidden
                          border border-border shadow-glow bg-black">
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-slide-up">
          {videoUrl && (
            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-3 px-7 py-3.5
                         bg-glow hover:bg-violet-500 text-white font-medium rounded-xl
                         shadow-glow hover:shadow-glow-lg transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Video
              <span className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}

          <button
            onClick={() => router.push('/create')}
            className="px-7 py-3.5 rounded-xl font-medium text-gray-300 border border-border
                       hover:border-glow-dim hover:text-white transition-all duration-300"
          >
            Create Another Vision
          </button>
        </div>
      </main>
    </div>
  )
}
