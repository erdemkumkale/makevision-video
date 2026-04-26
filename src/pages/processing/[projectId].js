import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
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
  const router            = useRouter()
  const { projectId }     = router.query
  const { user }          = useAuth()
  const [stageIndex, setStageIndex] = useState(0)
  const [jobStatus, setJobStatus]   = useState('processing')
  const [errorMsg, setErrorMsg]     = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setStageIndex((i) => (i + 1) % STAGES.length), 3500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!projectId || !user) return

    const poll = async () => {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('id, status, video_url, error')
        .eq('vision_project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) { console.log('Poll error:', error.message); return }
      if (!data)  { console.log('Waiting for job row...'); return }

      setJobStatus(data.status)

      if (data.status === 'completed' && data.video_url) {
        clearInterval(pollRef.current)
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

    poll()
    pollRef.current = setInterval(poll, 6000)
    return () => clearInterval(pollRef.current)
  }, [projectId, user, router])

  return (
    <>
      <Head>
        <title>Creating Your Vision — YourVision</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,200;0,300;1,200;1,300&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(1) } 50% { opacity:1; transform:scale(1.06) } }
        @keyframes orbit { to { transform: rotate(360deg) } }
        @keyframes fade { from { opacity:0 } to { opacity:1 } }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#0A0908', color: '#F4F1EA',
        fontFamily: "'General Sans', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
      }}>

        {jobStatus === 'failed' ? (
          <>
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                border: '1px solid rgba(224,112,112,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
              }}>
                <span style={{ fontSize: '1.8rem' }}>✕</span>
              </div>
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.8rem', fontWeight: 300, marginBottom: '12px' }}>
              Something went wrong.
            </h1>
            <p style={{ color: '#C5BFB8', fontSize: '0.9rem', marginBottom: '32px', maxWidth: '360px', lineHeight: 1.7 }}>
              {errorMsg}
            </p>
            <button
              onClick={() => router.push(`/review/${projectId}`)}
              style={{
                border: '1px solid #C9A961', background: 'transparent',
                color: '#C9A961', fontSize: '0.85rem', letterSpacing: '0.14em',
                textTransform: 'uppercase', padding: '12px 36px',
                borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Back to Review
            </button>
          </>
        ) : (
          <>
            {/* Animated orb */}
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: '52px' }}>
              {/* Outer ring orbiting */}
              <div style={{
                position: 'absolute', inset: 0,
                animation: 'orbit 4s linear infinite',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%) translateY(-4px)',
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#C9A961', boxShadow: '0 0 8px #C9A961',
                }} />
              </div>
              {/* Middle ring */}
              <div style={{
                position: 'absolute', inset: 12,
                borderRadius: '50%', border: '1px solid rgba(201,169,97,0.2)',
                animation: 'pulse 3s ease-in-out infinite',
              }} />
              {/* Core */}
              <div style={{
                position: 'absolute', inset: 24,
                borderRadius: '50%', border: '1px solid rgba(201,169,97,0.4)',
                background: 'rgba(201,169,97,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '1.4rem', animation: 'pulse 2.5s ease-in-out infinite' }}>✦</span>
              </div>
              {/* Outer border */}
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%', border: '1px solid rgba(201,169,97,0.1)',
              }} />
            </div>

            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: 300, lineHeight: 1.2,
              letterSpacing: '0.03em', marginBottom: '16px',
            }}>
              Your vision is<br />
              <em style={{ fontStyle: 'italic', color: '#C9A961' }}>being born.</em>
            </h1>

            <p
              key={stageIndex}
              style={{
                color: '#C5BFB8', fontSize: '0.9rem', marginBottom: '40px',
                animation: 'fade 0.6s ease',
              }}
            >
              {STAGES[stageIndex]}
            </p>

            <p style={{ fontSize: '0.78rem', color: '#4A4640', maxWidth: '320px', lineHeight: 1.8, letterSpacing: '0.02em' }}>
              This takes 4–6 minutes. You can safely close this tab — your video will be waiting in your dashboard.
            </p>

            <div style={{
              marginTop: '40px', padding: '6px 20px',
              border: '1px solid #1F1D1A', borderRadius: '2px',
              fontSize: '0.72rem', color: '#4A4640', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {jobStatus}
            </div>
          </>
        )}
      </div>
    </>
  )
}
