/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META = {
  Draft:           { label: 'Draft',           color: '#4A4640', bg: 'rgba(74,70,64,0.12)',  border: 'rgba(74,70,64,0.3)'  },
  Images_Ready:    { label: 'Review Ready',     color: '#C9A961', bg: 'rgba(201,169,97,0.1)', border: 'rgba(201,169,97,0.3)' },
  Payment_Pending: { label: 'Payment Pending',  color: '#C9A961', bg: 'rgba(201,169,97,0.1)', border: 'rgba(201,169,97,0.3)' },
  Processing:      { label: 'Rendering…',       color: '#C9A961', bg: 'rgba(201,169,97,0.1)', border: 'rgba(201,169,97,0.3)' },
  Videos_Ready:    { label: 'Rendering…',       color: '#C9A961', bg: 'rgba(201,169,97,0.1)', border: 'rgba(201,169,97,0.3)' },
  Completed:       { label: 'Completed',        color: '#7EC99A', bg: 'rgba(126,201,154,0.1)', border: 'rgba(126,201,154,0.3)' },
  Failed:          { label: 'Failed',           color: '#E07070', bg: 'rgba(224,112,112,0.1)', border: 'rgba(224,112,112,0.3)' },
}

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] ?? STATUS_META.Draft
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 400, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: '2px',
      border: `1px solid ${meta.border}`, background: meta.bg, color: meta.color,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {meta.label}
    </span>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────

const ProjectCard = ({ project, onClick }) => {
  const date = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const firstImage = (project.thumbnail ?? [])
    .filter(t => t.media_url && !t.is_redo)
    .sort((a, b) => a.order_num - b.order_num)[0]
  const thumbUrl = firstImage?.media_url ?? null
  const videoUrl = project.final_video_url ?? null
  const hasThumb = !!thumbUrl && ['Images_Ready', 'Processing', 'Videos_Ready', 'Completed'].includes(project.status)

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        cursor: 'pointer', background: '#0F0E0C',
        border: '1px solid #1F1D1A', borderRadius: '4px', padding: '12px',
        transition: 'border-color 300ms',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#4A4640'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1F1D1A'}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: '9/16', width: '100%', position: 'relative', marginBottom: '10px', borderRadius: '2px', background: '#0A0908', border: '1px solid #1F1D1A', overflow: 'hidden' }}>
        {project.status === 'Completed' && videoUrl ? (
          <video
            src={videoUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            muted playsInline preload="metadata"
          />
        ) : hasThumb ? (
          <img
            src={thumbUrl}
            alt="preview"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : null}

        {/* No preview placeholder */}
        {!(project.status === 'Completed' && videoUrl) && !hasThumb && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.25 }}>
            <svg style={{ width: 28, height: 28, color: '#8A857C' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <span style={{ fontSize: '0.65rem', color: '#4A4640' }}>No preview</span>
          </div>
        )}

        {/* Completed play overlay */}
        {project.status === 'Completed' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 300ms' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 16, height: 16, color: 'white', marginLeft: 2 }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Rendering spinner */}
        {(project.status === 'Processing' || project.status === 'Videos_Ready') && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #C9A961', borderTopColor: 'transparent', animation: 'spin 1.2s linear infinite' }} />
            <span style={{ fontSize: '0.65rem', color: 'rgba(201,169,97,0.7)' }}>Rendering…</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <p style={{ fontSize: '0.78rem', color: '#F4F1EA', fontWeight: 400, marginBottom: '2px' }}>
            Vision #{project.id.slice(-6).toUpperCase()}
          </p>
          <p style={{ fontSize: '0.7rem', color: '#4A4640' }}>{date}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {project.revision_count > 0 && (
        <p style={{ fontSize: '0.7rem', color: '#4A4640', marginTop: '6px' }}>
          {project.revision_count} revision{project.revision_count > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ onCreate }) => (
  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 32px', gap: '24px' }}>
    <div style={{ width: 72, height: 72, borderRadius: '50%', border: '1px solid #1F1D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 28, height: 28, color: '#C9A961' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    </div>
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: '1.4rem', fontWeight: 300, letterSpacing: '0.04em', color: '#F4F1EA', marginBottom: '8px' }}>No visions yet</p>
      <p style={{ fontSize: '0.85rem', color: '#4A4640', fontWeight: 300 }}>Your first creation is one click away.</p>
    </div>
    <button onClick={onCreate} style={{
      padding: '12px 36px', border: '1px solid #C9A961', background: 'transparent',
      color: '#C9A961', fontSize: '0.78rem', fontWeight: 400, letterSpacing: '0.14em',
      textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
    }}>
      Create Your First Vision
    </button>
  </div>
)

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [justCompleted, setJustCompleted] = useState(null)

  const firstName = profile?.name?.split(' ')[0] ?? 'Visionary'

  const loadProjects = React.useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('vision_projects')
      .select('*, final_video_url, thumbnail:media_generations(media_url, order_num, is_redo)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) {
      setProjects(prev => {
        const prevProcessing = prev
          .filter(p => p.status === 'Processing' || p.status === 'Videos_Ready')
          .map(p => p.id)
        const newlyDone = (data ?? []).find(
          p => p.status === 'Completed' && prevProcessing.includes(p.id)
        )
        if (newlyDone) setJustCompleted(newlyDone.id)
        return data ?? []
      })
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadProjects() }, [loadProjects])

  useEffect(() => {
    const hasActive = projects.some(p => p.status === 'Processing' || p.status === 'Videos_Ready')
    if (!hasActive) return
    const interval = setInterval(loadProjects, 10000)
    return () => clearInterval(interval)
  }, [projects, loadProjects])

  useEffect(() => {
    if (!user && !loading) router.replace('/login')
  }, [user, loading, router])

  const handleCardClick = (project) => {
    if (project.status === 'Completed') router.push(`/result/${project.id}`)
    else if (project.status === 'Images_Ready') router.push(`/review/${project.id}`)
    else if (project.status === 'Processing' || project.status === 'Videos_Ready') router.push(`/processing/${project.id}`)
    else router.push(`/review/${project.id}`)
  }

  return (
    <>
      <Head>
        <title>YourVision — Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0A0908', color: '#F4F1EA', fontFamily: "'General Sans','Inter',-apple-system,sans-serif", fontWeight: 300 }}>

        {/* "Video ready" toast */}
        {justCompleted && (
          <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15,14,12,0.95)', border: '1px solid rgba(126,201,154,0.4)', color: '#7EC99A', padding: '12px 20px', borderRadius: '4px', backdropFilter: 'blur(12px)', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
              <span style={{ fontSize: '1rem' }}>✦</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 400 }}>Your vision video is ready!</span>
              <button onClick={() => router.push(`/result/${justCompleted}`)} style={{ background: 'none', border: 'none', color: '#7EC99A', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', fontFamily: 'inherit' }}>
                Watch now →
              </button>
              <button onClick={() => setJustCompleted(null)} style={{ background: 'none', border: 'none', color: '#4A4640', cursor: 'pointer', fontFamily: 'inherit', marginLeft: '4px' }}>✕</button>
            </div>
          </div>
        )}

        {/* Nav */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: '64px',
          background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1F1D1A',
        }}>
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {profile?.profile_picture && (
              <img src={profile.profile_picture} alt="avatar"
                style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #1F1D1A', objectFit: 'cover' }} />
            )}
            <span style={{ fontSize: '0.78rem', color: '#4A4640' }} className="hidden sm:block">{profile?.email}</span>
            <button
              onClick={async () => { await signOut(); router.replace('/') }}
              style={{
                background: 'none', border: '1px solid #1F1D1A', color: '#4A4640',
                fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '7px 16px', borderRadius: '4px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'color 300ms, border-color 300ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F4F1EA'; e.currentTarget.style.borderColor = '#4A4640' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4A4640'; e.currentTarget.style.borderColor = '#1F1D1A' }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 40px' }}>
          {/* Greeting */}
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', marginBottom: '8px' }}>
              Welcome back, <em style={{ fontStyle: 'italic', color: '#C9A961' }}>{firstName}.</em>
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#4A4640', fontWeight: 300 }}>
              {projects.length > 0
                ? `${projects.length} vision${projects.length > 1 ? 's' : ''} in the making.`
                : 'Ready to manifest something extraordinary?'}
            </p>
          </div>

          {/* Create CTA */}
          <button
            onClick={() => router.push('/create')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '12px 32px', border: '1px solid #C9A961', background: 'transparent',
              color: '#C9A961', fontSize: '0.78rem', fontWeight: 400,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
              marginBottom: '52px', transition: 'color 300ms, border-color 300ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Vision
          </button>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ background: '#0F0E0C', border: '1px solid #1F1D1A', borderRadius: '4px', padding: '12px' }}>
                  <div style={{ aspectRatio: '9/16', width: '100%', marginBottom: '10px', background: '#0A0908', borderRadius: '2px' }} />
                  <div style={{ height: '10px', background: '#1F1D1A', borderRadius: '2px', width: '60%', marginBottom: '6px' }} />
                  <div style={{ height: '10px', background: '#1F1D1A', borderRadius: '2px', width: '40%' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {projects.length === 0
                ? <EmptyState onCreate={() => router.push('/create')} />
                : projects.map(p => (
                    <ProjectCard key={p.id} project={p} onClick={() => handleCardClick(p)} />
                  ))
              }
            </div>
          )}
        </main>

        <footer style={{ borderTop: '1px solid #1F1D1A', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '0.72rem', color: '#4A4640' }}>© {new Date().getFullYear()} YourVision</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/terms" style={{ fontSize: '0.72rem', color: '#4A4640', textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ fontSize: '0.72rem', color: '#4A4640', textDecoration: 'none' }}>Privacy</Link>
            <a href="mailto:hello@yourvision.video" style={{ fontSize: '0.72rem', color: '#4A4640', textDecoration: 'none' }}>Contact</a>
          </div>
        </footer>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )
}
