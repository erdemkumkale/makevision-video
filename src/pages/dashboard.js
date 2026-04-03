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
  Completed:       'bg-emerald-900/40 text-emerald-300 border-emerald-700',
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

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-panel border border-border rounded-2xl p-5
                 hover:border-glow-dim hover:shadow-glow-sm transition-all duration-300 animate-fade-in"
    >
      {/* Thumbnail placeholder */}
      <div className="w-full aspect-video rounded-xl bg-void border border-border mb-4
                      flex items-center justify-center overflow-hidden relative">
        {project.final_video_url ? (
          <video src={project.final_video_url} className="w-full h-full object-cover" muted />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <svg className="w-8 h-8 text-glow-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <span className="text-xs text-gray-600">No preview yet</span>
          </div>
        )}
        {project.status === 'Processing' && (
          <div className="absolute inset-0 bg-glow/10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors">
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
    </button>
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
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)

  const firstName = profile?.name?.split(' ')[0] ?? 'Visionary'

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data, error } = await supabase
        .from('vision_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setProjects(data ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) router.replace('/login')
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-void text-white">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-panel border border-border rounded-2xl p-5 animate-pulse">
                <div className="w-full aspect-video rounded-xl bg-void mb-4" />
                <div className="h-3 bg-border rounded w-1/2 mb-2" />
                <div className="h-3 bg-border rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.length === 0
              ? <EmptyState onCreate={() => router.push('/create')} />
              : projects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => router.push(`/review/${p.id}`)}
                  />
                ))
            }
          </div>
        )}
      </main>
    </div>
  )
}
