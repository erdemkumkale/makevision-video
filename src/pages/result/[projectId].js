import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STORAGE = 'https://ibcxaytaewufzluxnjbc.supabase.co/storage/v1/object/public/vision-assets'

export default function Result() {
  const router               = useRouter()
  const { projectId, video } = router.query
  const { user }             = useAuth()

  const [videoUrl, setVideoUrl] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [images, setImages]     = useState([])
  const [copied, setCopied]     = useState(false)

  const loadImages = (pid) => {
    const imgs = [0,1,2,3,4,5].map(i =>
      `${STORAGE}/projects/${pid}/images/${i}.jpg`
    )
    setImages(imgs)
  }

  useEffect(() => {
    if (!projectId || !user) return

    const load = async () => {
      if (video) {
        setVideoUrl(decodeURIComponent(video))
        loadImages(projectId)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('vision_projects')
        .select('final_video_url, status')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) { router.replace('/dashboard'); return }

      if (data.final_video_url) {
        setVideoUrl(data.final_video_url)
        loadImages(projectId)
        setLoading(false)
      } else if (data.status === 'Completed') {
        const { data: job } = await supabase
          .from('video_jobs')
          .select('video_url')
          .eq('vision_project_id', projectId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (job?.video_url) {
          setVideoUrl(job.video_url)
          loadImages(projectId)
          setLoading(false)
        } else {
          router.replace('/dashboard')
        }
      } else if (data.status === 'Processing' || data.status === 'Videos_Ready') {
        router.replace(`/processing/${projectId}`)
      } else {
        router.replace('/dashboard')
      }
    }

    load()
  }, [projectId, video, user, router])

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/result/${projectId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Vision Video', text: 'I just created a cinematic video of my dream life ✦', url: shareUrl })
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #1F1D1A', borderTopColor: '#C9A961', animation: 'spin 1.2s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Your Vision — YourVision</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,200;0,300;1,200;1,300&display=swap" rel="stylesheet" />
      </Head>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ minHeight: '100vh', background: '#0A0908', color: '#F4F1EA', fontFamily: "'General Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid #1F1D1A', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#C5BFB8', fontSize: '0.8rem', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
        </nav>

        {/* Body */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', animation: 'fade 0.8s ease' }}>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '20px' }}>
              Your Vision Video
            </span>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em', marginBottom: '12px' }}>
              The life you named<br />
              <em style={{ fontStyle: 'italic', color: '#C9A961' }}>is alive.</em>
            </h1>
            <p style={{ color: '#C5BFB8', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.75 }}>
              A cinematic portrait of the life you&apos;re stepping into.
            </p>
          </div>

          {/* Video player */}
          {videoUrl && (
            <div style={{
              width: '100%', maxWidth: '320px', marginBottom: '40px',
              border: '1px solid #1F1D1A', borderRadius: '4px', overflow: 'hidden',
              background: '#000',
            }}>
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '60px' }}>
            {videoUrl && (
              <a
                href={videoUrl}
                download="my-vision.mp4"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '12px 32px', border: '1px solid #C9A961',
                  color: '#C9A961', fontSize: '0.85rem', fontWeight: 400,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  borderRadius: '4px', textDecoration: 'none', fontFamily: 'inherit',
                  transition: 'color 300ms, border-color 300ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
              >
                Download
              </a>
            )}

            <button
              onClick={handleShare}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 32px', border: '1px solid #1F1D1A',
                color: '#C5BFB8', fontSize: '0.85rem', fontWeight: 400,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                borderRadius: '4px', cursor: 'pointer', background: 'none', fontFamily: 'inherit',
                transition: 'border-color 300ms, color 300ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A4640'; e.currentTarget.style.color = '#F4F1EA' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1D1A'; e.currentTarget.style.color = '#C5BFB8' }}
            >
              {copied ? 'Copied ✦' : 'Share'}
            </button>

            <button
              onClick={() => router.push('/create')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 32px', border: '1px solid #1F1D1A',
                color: '#4A4640', fontSize: '0.85rem', fontWeight: 400,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                borderRadius: '4px', cursor: 'pointer', background: 'none', fontFamily: 'inherit',
                transition: 'border-color 300ms, color 300ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A4640'; e.currentTarget.style.color = '#C5BFB8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1D1A'; e.currentTarget.style.color = '#4A4640' }}
            >
              + New Vision
            </button>
          </div>

          {/* Scenes grid */}
          {images.length > 0 && (
            <div style={{ width: '100%', maxWidth: '560px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#4A4640', textAlign: 'center', marginBottom: '16px' }}>
                Scenes
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {images.map((src, i) => (
                  <div key={i} style={{ aspectRatio: '9/16', borderRadius: '2px', overflow: 'hidden', border: '1px solid #1F1D1A', background: '#0F0E0C' }}>
                    <img
                      src={src}
                      alt={`Scene ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
