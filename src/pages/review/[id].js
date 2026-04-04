/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

// ─── Single image card ────────────────────────────────────────────────────────
// Each card represents ONE prompt slot (order_num 0-5).
// versions[0] = original, versions[1] = redo (if exists).
// V1/V2 buttons only appear on THIS card after a redo is done for THIS slot.

const ImageCard = ({ versions, selectedId, onSelectVersion, onRedo, redoing }) => {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback]         = useState('')
  const [localRedoing, setLocalRedoing] = useState(false)

  const active   = versions.find((v) => v.id === selectedId) ?? versions[0]
  const original = versions.find((v) => !v.is_redo) ?? versions[0]
  const hasRedo  = versions.some((v) => v.is_redo)
  const canRedo  = !hasRedo && original && original.revision_count < 1
  const busy     = localRedoing || redoing

  const handleRedo = async () => {
    if (!feedback.trim()) return
    setLocalRedoing(true)
    await onRedo(original.id, feedback)
    setLocalRedoing(false)
    setShowFeedback(false)
    setFeedback('')
  }

  return (
    <div className="group relative bg-panel border border-border rounded-2xl overflow-hidden
                    hover:border-glow-dim hover:shadow-glow-sm transition-all duration-300 animate-fade-in">
      {/* Image area */}
      <div className="relative aspect-[3/4] bg-void overflow-hidden">
        {active?.media_url ? (
          <img
            src={active.media_url}
            alt={`Vision ${(active.order_num ?? 0) + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {active?.media_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {busy && (
          <div className="absolute inset-0 bg-void/70 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-glow-soft">Regenerating...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {active?.prompt_text}
        </p>

        {/* V1 / V2 — only shown on this card when THIS slot has a redo */}
        {hasRedo && (
          <div className="flex gap-1.5">
            {versions.map((v, i) => (
              <button
                key={v.id}
                onClick={() => onSelectVersion(v.id)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all duration-200
                  ${v.id === selectedId
                    ? 'bg-glow text-white shadow-glow-sm'
                    : 'bg-panel border border-border text-gray-500 hover:border-glow-dim hover:text-gray-300'
                  }`}
              >
                V{i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Redo / used */}
        {canRedo ? (
          showFeedback ? (
            <div className="space-y-2 animate-fade-in">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What would you change? e.g. &apos;Make it sunset, more vibrant&apos;"
                rows={2}
                className="input-field text-xs resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRedo}
                  disabled={!feedback.trim() || busy}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-glow hover:bg-violet-500
                             text-white transition-colors disabled:opacity-40"
                >
                  {busy ? 'Regenerating...' : 'Regenerate'}
                </button>
                <button
                  onClick={() => { setShowFeedback(false); setFeedback('') }}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300
                             border border-border hover:border-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFeedback(true)}
              disabled={busy || !active?.media_url}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-gray-400
                         border border-border hover:border-glow-dim hover:text-glow-soft
                         transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↺ Redo <span className="text-gray-600">(1 left)</span>
            </button>
          )
        ) : hasRedo ? (
          <div className="w-full py-1.5 rounded-lg text-xs text-center text-gray-700
                          border border-border/50 cursor-not-allowed select-none">
            Redo used
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Review page ──────────────────────────────────────────────────────────────

export default function ReviewVision() {
  const router            = useRouter()
  const { id: projectId } = router.query
  const { user }          = useAuth()

  const [generations, setGenerations] = useState([])
  const [project, setProject]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [approving, setApproving]     = useState(false)
  const [devBypassing, setDevBypassing] = useState(false)
  const [redoingId, setRedoingId]     = useState(null)
  const [error, setError]             = useState(null)
  const [genError, setGenError]       = useState(null)
  const [retrying, setRetrying]       = useState(false)
  // { [order_num]: generation_id }
  const [selectedVersions, setSelectedVersions] = useState({})

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user || !projectId) return

    const [{ data: proj }, { data: gens }] = await Promise.all([
      supabase
        .from('vision_projects')
        .select('id, status, user_id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('media_generations')
        .select('id, prompt_text, media_url, is_selected, revision_count, order_num, is_redo, created_at')
        .eq('vision_project_id', projectId)
        .order('order_num', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    setProject(proj)
    const list = gens ?? []

    // ── Fix legacy data: if all rows share order_num=0, assign by position ──
    const uniqueOrderNums = new Set(list.filter((g) => !g.is_redo).map((g) => g.order_num))
    const needsReindex = uniqueOrderNums.size === 1 && list.filter((g) => !g.is_redo).length > 1
    const normalized = needsReindex
      ? (() => {
          let idx = 0
          return list.map((g) => g.is_redo ? g : { ...g, order_num: idx++ })
        })()
      : list

    setGenerations(normalized)

    // Default: select original for each slot (redo auto-selects when added)
    setSelectedVersions((prev) => {
      const next = { ...prev }
      buildSlotMap(normalized).forEach((versions, orderNum) => {
        if (next[orderNum] == null) {
          next[orderNum] = versions[0].id
        }
      })
      return next
    })

    // If any original slot is empty AND was created >5 min ago → stuck, show retry
    const STALE_MS = 5 * 60 * 1000
    const staleStuck = normalized.some(
      (g) => !g.is_redo && !g.media_url && (Date.now() - new Date(g.created_at).getTime()) > STALE_MS
    )
    if (staleStuck) {
      setGenError(
        'One or more images timed out during generation. ' +
        'Click "Retry Generation" — only the missing ones will be regenerated (no extra credits used).'
      )
    }

    setLoading(false)
  }, [user, projectId])

  useEffect(() => { loadData() }, [loadData])

  // Poll while any original is still pending — timeout after ~3 minutes
  useEffect(() => {
    const originals = generations.filter((g) => !g.is_redo)
    const hasPending = originals.some((g) => !g.media_url)
    if (!hasPending || loading || genError) return

    let pollCount = 0
    const MAX_POLLS = 30 // 30 × 6s = 3 minutes

    const interval = setInterval(() => {
      pollCount += 1
      if (pollCount >= MAX_POLLS) {
        clearInterval(interval)
        setGenError(
          'Image generation is taking too long — some visuals may have timed out. ' +
          'Click "Retry" to regenerate only the missing ones (no credit is wasted on the ones already done).'
        )
        return
      }
      loadData()
    }, 6000)

    return () => clearInterval(interval)
  }, [generations, loading, loadData, genError])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function buildSlotMap(list) {
    const map = new Map()
    list.forEach((g) => {
      if (!map.has(g.order_num)) map.set(g.order_num, [])
      map.get(g.order_num).push(g)
    })
    return map
  }

  // ── Retry ───────────────────────────────────────────────────────────────────
  const handleRetry = async () => {
    setRetrying(true)
    setGenError(null)
    try {
      await api.generateImages(projectId)
      await loadData()
    } catch (err) {
      setGenError(err.message ?? 'Image generation failed. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  // ── Redo ────────────────────────────────────────────────────────────────────
  // generationId = the original row's ID for this slot
  // feedback = user's text describing what to change
  const handleRedo = async (generationId, feedback) => {
    setRedoingId(generationId)
    setError(null)
    try {
      const result = await api.redoImage(generationId, feedback)
      if (!result?.generation) throw new Error('Redo returned no generation data')
      const newGen = result.generation
      setGenerations((prev) => [
        ...prev.map((g) => g.id === generationId ? { ...g, revision_count: 1 } : g),
        newGen,
      ])
      setSelectedVersions((prev) => ({ ...prev, [newGen.order_num]: newGen.id }))
    } catch (err) {
      console.error('[review] redo error:', err)
      setError(err.message ?? 'Redo failed. Please try again.')
    } finally {
      setRedoingId(null)
    }
  }

  // ── Approve (real payment flow) ─────────────────────────────────────────────
  const handleApprove = async () => {
    setApproving(true)
    setError(null)
    try {
      const selectedIds = Object.values(selectedVersions)
      await supabase
        .from('media_generations')
        .update({ is_selected: true })
        .in('id', selectedIds)

      const { error: updateError } = await supabase
        .from('vision_projects')
        .update({ status: 'Payment_Pending' })
        .eq('id', projectId)

      if (updateError) throw updateError
      router.push(`/checkout/${projectId}`)
    } catch (err) {
      setError(err.message)
      setApproving(false)
    }
  }

  // ── DEV: skip payment, trigger Kling → Shotstack pipeline ───────────────────
  const handleDevBypass = async () => {
    setDevBypassing(true)
    setError(null)
    try {
      const selectedIds = Object.values(selectedVersions)

      if (selectedIds.length !== 6) {
        throw new Error(`Expected 6 selections but got ${selectedIds.length}. Make sure all slots are ready.`)
      }

      // Mark selections in DB
      await supabase
        .from('media_generations')
        .update({ is_selected: true })
        .in('id', selectedIds)

      // generate-video: Kling ile 6 video üretir → biter bitmez Shotstack'i tetikler
      // Fire-and-forget: hemen döner, arka planda çalışır
      await api.generateVideo(projectId, selectedIds)

      router.push(`/processing/${projectId}`)
    } catch (err) {
      console.error('[review] dev bypass error:', err)
      setError(err.message ?? 'Video generation failed.')
      setDevBypassing(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-gray-500 text-sm">
        Project not found.
      </div>
    )
  }

  const slotMap   = buildSlotMap(generations)
  const originals = generations.filter((g) => !g.is_redo)
  const allReady  = originals.length > 0 && originals.every((g) => g.media_url)

  // Always render exactly 6 slots (0-5)
  const slotEntries = Array.from({ length: 6 }, (_, i) => ({
    orderNum: i,
    versions: slotMap.get(i) ?? [],
  }))

  return (
    <div className="min-h-screen bg-void text-white">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 animate-slide-up">
          <h1 className="text-3xl font-semibold text-white">Your Vision, Revealed</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review your 6 images. Redo any one — then pick V1 or V2 on that card before approving.
          </p>
        </div>

        {!allReady && !genError && (
          <div className="mb-8 flex items-center gap-3 px-5 py-3.5 rounded-xl
                          bg-glow-dim/20 border border-glow-dim text-sm text-glow-soft animate-fade-in">
            <div className="w-4 h-4 border-2 border-glow-soft border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Images are being generated. This page updates automatically.
          </div>
        )}

        {genError && (
          <div className="mb-8 px-5 py-4 rounded-xl bg-red-900/20 border border-red-800 animate-fade-in">
            <p className="text-sm text-red-400 mb-3">{genError}</p>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                         bg-red-800/40 hover:bg-red-700/50 text-red-300 border border-red-700
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retrying
                ? <><div className="w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />Retrying...</>
                : '↺ Retry Generation'}
            </button>
          </div>
        )}

        {/* 6-card grid — one card per prompt slot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          {slotEntries.map(({ orderNum, versions }) =>
            versions.length > 0 ? (
              <ImageCard
                key={orderNum}
                versions={versions}
                selectedId={selectedVersions[orderNum] ?? versions[0]?.id}
                onSelectVersion={(id) => setSelectedVersions((prev) => ({ ...prev, [orderNum]: id }))}
                onRedo={handleRedo}
                redoing={versions.some((v) => redoingId === v.id)}
              />
            ) : (
              <div key={`sk-${orderNum}`}
                className="bg-panel border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-void" />
                <div className="p-3 space-y-2">
                  <div className="h-2 bg-border rounded w-3/4" />
                  <div className="h-2 bg-border rounded w-1/2" />
                </div>
              </div>
            )
          )}
        </div>

        {error && (
          <p className="mb-6 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
                        gap-4 pt-8 border-t border-border">
          <div>
            <p className="text-sm text-gray-300 font-medium">Happy with your vision?</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Approving locks in your selected versions and moves you to checkout.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* DEV bypass — skip payment, go straight to video */}
            <button
              onClick={handleDevBypass}
              disabled={!allReady || devBypassing || approving || !!redoingId}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                         text-sm font-medium border border-amber-700/60 bg-amber-900/20
                         text-amber-400 hover:bg-amber-900/40 hover:border-amber-600
                         transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {devBypassing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Generating video...
                </>
              ) : '🛠 [DEV] Skip Payment & Create Video'}
            </button>

            {/* Real approve button */}
            <button
              onClick={handleApprove}
              disabled={!allReady || approving || devBypassing || !!redoingId}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5
                         bg-glow hover:bg-violet-500 text-white font-medium rounded-xl
                         shadow-glow hover:shadow-glow-lg transition-all duration-300
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {approving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Approve & Continue ✦
                  <span className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
