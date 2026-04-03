import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STAGES = [
  'Generating your visuals...',
  'Swapping faces into scenes...',
  'Animating your story...',
  'Composing the soundtrack...',
  'Stitching the final video...',
  'Almost there...',
]

export default function Processing() {
  const router              = useRouter()
  const { projectId }       = router.query
  const { user }            = useAuth()
  const [stageIndex, setStageIndex] = useState(0)
  const [jobStatus, setJobStatus]   = useState('processing')
  const [errorMsg, setErrorMsg]     = useState(null)
  const pollRef = useRef(null)

  // Cycle stage labels for UX
  useEffect(() => {
    const interval = setInterval(() => setStageIndex((i) => (i + 1) % STAGES.length), 3500)
    return () => clearInterval(interval)
  }, [])

  // Poll video_jobs for this project
  useEffect(() => {
    if (!projectId || !user) return

    const poll = async () => {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('id, status, video_url, error')
        .eq('vision_project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // Job row not yet created — keep waiting
        console.log('Waiting for job row...')
        return
      }

      setJobStatus(data.status)

      if (data.status === 'completed' && data.video_url) {
        clearInterval(pollRef.current)
        // Store video_url in project for the result page, then redirect
        await supabase
          .from('vision_projects')
          .update({ status: 'Completed' })
          .eq('id', projectId)
        router.push(`/result/${projectId}?video=${encodeURIComponent(data.video_url)}`)
      }

      if (data.status === 'failed') {
        clearInterval(pollRef.current)
        setErrorMsg(data.error ?? 'Pipeline failed. Please try again.')
      }
    }

    poll() // immediate first check
    pollRef.current = setInterval(poll, 6000)
    return () => clearInterval(pollRef.current)
  }, [projectId, user, router])

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-6 text-white">
      {/* Orb */}
      <div className="relative mb-12">
        <div className="w-32 h-32 rounded-full bg-glow-dim/20 border border-glow-dim
                        flex items-center justify-center shadow-glow animate-pulse-slow">
          <div className="w-20 h-20 rounded-full bg-glow/30 border border-glow
                          flex items-center justify-center shadow-glow-lg">
            {jobStatus === 'failed' ? (
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-glow-soft animate-spin" style={{ animationDuration: '3s' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </div>
        </div>
        {jobStatus !== 'failed' && (
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1
                            w-2.5 h-2.5 rounded-full bg-glow-soft shadow-glow-sm" />
          </div>
        )}
      </div>

      {jobStatus === 'failed' ? (
        <>
          <h1 className="text-2xl font-semibold text-white mb-2 text-center">Something went wrong</h1>
          <p className="text-red-400 text-sm text-center mb-6 max-w-sm">{errorMsg}</p>
          <button
            onClick={() => router.push(`/review/${projectId}`)}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-glow hover:bg-violet-500
                       text-white transition-colors"
          >
            Back to Review
          </button>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-white mb-2 text-center">
            Your Vision is Being Born
          </h1>
          <p key={stageIndex} className="text-glow-soft text-sm animate-fade-in text-center mb-8">
            {STAGES[stageIndex]}
          </p>
          <p className="text-xs text-gray-600 text-center max-w-xs">
            This takes 4–6 minutes. You can safely close this tab — come back to your dashboard when ready.
          </p>
          <div className="mt-8 px-4 py-1.5 rounded-full border border-glow-dim bg-glow-dim/20 text-xs text-glow-soft">
            Status: {jobStatus}
          </div>
        </>
      )}
    </div>
  )
}
