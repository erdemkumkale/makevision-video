/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  Draft:           'bg-muted/40 text-gray-400 border-muted',
  Images_Ready:    'bg-blue-900/40 text-blue-300 border-blue-700',
  Payment_Pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  Processing:      'bg-purple-900/40 text-glow-soft border-glow-dim',
  Videos_Ready:    'bg-purple-900/40 text-glow-soft border-glow-dim',
  Completed:       'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  Failed:          'bg-red-900/40 text-red-400 border-red-700',
}

const StatusBadge = ({ status }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.Draft}`}>
    {status.replace('_', ' ')}
  </span>
)

// ─── Project card ─────────────────────────────────────────────────────────────

const ProjectCard = ({ project, onClick }) => {
  const date = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  // DB'den gelen gerçek URL — hardcode path yerine
  const firstImage = (project.thumbnail ?? [])
    .filter(t => t.media_url)
    .sort((a, b) => a.order_num - b.order_num)[0]
  const thumbUrl = firstImage?.media_url ?? null
  const hasThumb = !!thumbUrl && ['Images_Ready','Processing','Videos_Ready','Completed'].includes(project.status)

  return (
    // button yerine div — button içinde aspect-ratio / height hesabı tutarsız çalışıyor
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="group cursor-pointer text-left w-full bg-panel border border-border rounded-2xl p-3
                 hover:border-glow-dim hover:shadow-glow-sm transition-all duration-300 animate-fade-in"
    >
      {/* Thumbnail — 9:16 portrait. aspect-ratio div'de kesinlikle çalışır */}
      <div style={{ aspectRatio: '9/16', width: '100%', position: 'relative', marginBottom: '12px' }}
           className="rounded-xl bg-void border border-border overflow-hidden">
        {hasThumb && (
          <img
            src={thumbUrl}
            alt="preview"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        {!hasThumb && (
          <div style={{ position: 'absolute', inset: 0 }}
               className="flex flex-col items-center justify-center gap-2 opacity-30">
            <svg className="w-8 h-8 text-glow-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <span className="text-xs text-gray-600">No preview yet</span>
          </div>
        )}
        {project.status === 'Completed' && (
          <div style={{ position: 'absolute', inset: 0 }}
               className="bg-black/30 flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30
                            flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {(project.status === 'Processing' || project.status === 'Videos_Ready') && (
          <div style={{ position: 'absolute', inset: 0 }}
               className="bg-black/50 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-glow-soft/70">Rendering…</span>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-200 font-medium group-hover:text-white transition-colors">
            Vision #{project.id.slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">{date}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {project.revision_count > 0 && (
        <p className="text-xs text-muted mt-2">
          {project.revision_count} revision{project.revision_count > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ onCreate }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-24 gap-6 animate-fade-in">
    <div className="w-20 h-20 rounded-full bg-glow-dim/30 border border-glow-dim flex items-center justify-center shadow-glow">
      <svg className="w-9 h-9 text-glow-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 4v16m8-8H4" />
      </svg>
    </div>
    <div className="text-center">
      <p className="text-gray-200 font-medium text-lg">No visions yet</p>
      <p className="text-gray-500 text-sm mt-1">Your first creation is one click away.</p>
    </div>
    <button onClick={onCreate} className="btn-glow">Create Your First Vision</button>
  </div>
)

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [projects, setProjects]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [justCompleted, setJustCompleted] = useState(null) // proje ID

  const firstName = profile?.name?.split(' ')[0] ?? 'Visionary'

  const loadProjects = React.useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('vision_projects')
      .select('*, thumbnail:media_generations(media_url, order_num)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) {
      setProjects(prev => {
        // Yeni tamamlanan proje var mı kontrol et
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

  // İlk yükleme
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Otomatik yenileme — Processing/Videos_Ready proje varsa her 10s poll
  useEffect(() => {
    const hasActive = projects.some(
      p => p.status === 'Processing' || p.status === 'Videos_Ready'
    )
    if (!hasActive) return
    const interval = setInterval(loadProjects, 10000)
    return () => clearInterval(interval)
  }, [projects, loadProjects])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) router.replace('/login')
  }, [user, loading, router])

  const handleCardClick = (project) => {
    if (project.status === 'Completed') {
      router.push(`/result/${project.id}`)
    } else if (project.status === 'Images_Ready') {
      router.push(`/review/${project.id}`)
    } else if (project.status === 'Processing' || project.status === 'Videos_Ready') {
      router.push(`/processing/${project.id}`)
    } else {
      router.push(`/review/${project.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-void text-white">
      {/* "Videon hazır" bildirimi */}
      {justCompleted && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 bg-emerald-900/90 border border-emerald-500
                          text-emerald-200 px-5 py-3 rounded-2xl shadow-glow backdrop-blur-sm">
            <span className="text-lg">🎬</span>
            <span className="text-sm font-medium">Your vision video is ready!</span>
            <button
              onClick={() => router.push(`/result/${justCompleted}`)}
              className="ml-2 text-xs underline text-emerald-300 hover:text-white"
            >
              Watch now →
            </button>
            <button onClick={() => setJustCompleted(null)} className="ml-2 text-emerald-500 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-glow-soft font-semibold tracking-wide text-sm">
            MakeVision<span className="text-gray-500">.video</span>
          </span>
          <div className="flex items-center gap-3">
            {profile?.profile_picture && (
              <img src={profile.profile_picture} alt="avatar"
                className="w-8 h-8 rounded-full border border-border object-cover" />
            )}
            <span className="text-sm text-gray-400">{profile?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Greeting */}
        <div className="mb-10 animate-slide-up">
          <h1 className="text-3xl font-semibold text-white">
            Welcome back, <span className="text-glow-soft">{firstName}</span>.
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {projects.length > 0
              ? `You have ${projects.length} vision${projects.length > 1 ? 's' : ''} in the making.`
              : 'Ready to manifest something extraordinary?'}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/create')}
          className="mb-12 group relative inline-flex items-center gap-3 px-7 py-3.5
                     bg-glow hover:bg-violet-500 text-white font-medium rounded-xl
                     shadow-glow hover:shadow-glow-lg transition-all duration-300 animate-slide-up"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Vision
          <span className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-panel border border-border rounded-2xl p-3 animate-pulse">
                <div style={{ aspectRatio: '9/16', width: '100%', marginBottom: '12px' }}
                     className="rounded-xl bg-void" />
                <div className="h-3 bg-border rounded w-1/2 mb-2" />
                <div className="h-3 bg-border rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.length === 0
              ? <EmptyState onCreate={() => router.push('/create')} />
              : projects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => handleCardClick(p)}
                  />
                ))
            }
          </div>
        )}
      </main>
    </div>
  )
}
