/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 20, color = '#C9A961' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `1px solid rgba(201,169,97,0.2)`,
    borderTopColor: color,
    animation: 'spin 1s linear infinite', flexShrink: 0,
  }} />
)

// ─── Image card ───────────────────────────────────────────────────────────────
const ImageCard = ({
  versions, selectedId, onSelectVersion, onRedo, redoing,
  affirmation, onAffirmationChange, onAffirmationToggle,
}) => {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback]         = useState('')
  const [localRedoing, setLocalRedoing] = useState(false)
  const [editingAff, setEditingAff]     = useState(false)
  const [customAff, setCustomAff]       = useState('')

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
    <div style={{
      background: '#0F0E0C', border: '1px solid #1F1D1A', borderRadius: '4px',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '3/4', background: '#0A0908', overflow: 'hidden' }}>
        {active?.media_url ? (
          <img
            src={active.media_url}
            alt={`Vision ${(active.order_num ?? 0) + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
          </div>
        )}
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(10,9,8,0.75)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <Spinner />
            <p style={{ fontSize: '0.82rem', color: '#C9A961', letterSpacing: '0.1em' }}>Regenerating...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* V1 / V2 toggle */}
        {hasRedo && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {versions.map((v, i) => (
              <button
                key={v.id}
                onClick={() => onSelectVersion(v.id)}
                style={{
                  flex: 1, padding: '4px 0', fontSize: '0.82rem', fontWeight: 400,
                  letterSpacing: '0.08em', border: '1px solid',
                  borderColor: v.id === selectedId ? '#C9A961' : '#1F1D1A',
                  color: v.id === selectedId ? '#C9A961' : '#4A4640',
                  background: v.id === selectedId ? 'rgba(201,169,97,0.08)' : 'transparent',
                  borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 200ms',
                }}
              >
                V{i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Redo */}
        {canRedo ? (
          showFeedback ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What to change? e.g. 'More sunset, warmer tones'"
                rows={2}
                autoFocus
                style={{
                  background: '#0A0908', border: '1px solid #2A2520', borderRadius: '2px',
                  color: '#F4F1EA', fontSize: '0.88rem', padding: '8px 10px', resize: 'none',
                  fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
                }}
                onFocus={e => e.target.style.borderColor = '#C9A961'}
                onBlur={e => e.target.style.borderColor = '#2A2520'}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleRedo}
                  disabled={!feedback.trim() || busy}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: '0.82rem',
                    border: '1px solid #C9A961', color: '#C9A961', background: 'transparent',
                    borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit',
                    opacity: (!feedback.trim() || busy) ? 0.4 : 1,
                    transition: 'opacity 200ms',
                  }}
                >
                  {busy ? 'Working...' : 'Regenerate'}
                </button>
                <button
                  onClick={() => { setShowFeedback(false); setFeedback('') }}
                  style={{
                    padding: '6px 10px', fontSize: '0.82rem',
                    border: '1px solid #1F1D1A', color: '#4A4640', background: 'transparent',
                    borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFeedback(true)}
              disabled={busy || !active?.media_url}
              style={{
                width: '100%', padding: '6px 0', fontSize: '0.82rem',
                border: '1px solid #1F1D1A', color: '#4A4640', background: 'transparent',
                borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit',
                opacity: (busy || !active?.media_url) ? 0.3 : 1,
                transition: 'border-color 200ms, color 200ms',
              }}
              onMouseEnter={e => { if (!busy && active?.media_url) { e.currentTarget.style.borderColor = '#C9A961'; e.currentTarget.style.color = '#C9A961' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1D1A'; e.currentTarget.style.color = '#4A4640' }}
            >
              ↺ Redo <span style={{ color: '#2A2520' }}>(1 left)</span>
            </button>
          )
        ) : hasRedo ? (
          <p style={{ fontSize: '0.88rem', color: '#2A2520', textAlign: 'center', letterSpacing: '0.06em' }}>Redo used</p>
        ) : null}

        {/* Affirmation */}
        {active?.media_url && (
          <div style={{ borderTop: '1px solid #1F1D1A', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4A4640' }}>Affirmation</span>
              <button
                onClick={() => onAffirmationToggle?.(!affirmation?.enabled)}
                style={{
                  fontSize: '0.82rem', padding: '2px 8px', borderRadius: '2px',
                  border: `1px solid ${affirmation?.enabled ? '#C9A961' : '#1F1D1A'}`,
                  color: affirmation?.enabled ? '#C9A961' : '#4A4640',
                  background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  letterSpacing: '0.06em', transition: 'all 200ms',
                }}
              >
                {affirmation?.enabled ? 'On' : 'Off'}
              </button>
            </div>

            {affirmation?.enabled && (
              editingAff ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    value={customAff}
                    onChange={(e) => setCustomAff(e.target.value)}
                    maxLength={80}
                    placeholder="Write your affirmation..."
                    autoFocus
                    style={{
                      background: '#0A0908', border: '1px solid #2A2520', borderRadius: '2px',
                      color: '#F4F1EA', fontSize: '0.88rem', padding: '6px 10px',
                      fontFamily: 'inherit', outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A961'}
                    onBlur={e => e.target.style.borderColor = '#2A2520'}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { if (customAff.trim()) onAffirmationChange?.(customAff.trim()); setEditingAff(false) }}
                      style={{
                        flex: 1, padding: '4px 0', fontSize: '0.88rem',
                        border: '1px solid #C9A961', color: '#C9A961', background: 'transparent',
                        borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Save</button>
                    <button
                      onClick={() => { setEditingAff(false); setCustomAff('') }}
                      style={{
                        padding: '4px 8px', fontSize: '0.88rem',
                        border: '1px solid #1F1D1A', color: '#4A4640', background: 'transparent',
                        borderRadius: '2px', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.88rem', color: '#C5BFB8', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '4px' }}>
                    &ldquo;{affirmation?.text ?? '—'}&rdquo;
                  </p>
                  <button
                    onClick={() => { setCustomAff(affirmation?.text ?? ''); setEditingAff(true) }}
                    style={{
                      fontSize: '0.82rem', color: '#4A4640', background: 'none',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      letterSpacing: '0.06em', padding: 0,
                      transition: 'color 200ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#C5BFB8'}
                    onMouseLeave={e => e.currentTarget.style.color = '#4A4640'}
                  >Edit</button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Plan config ──────────────────────────────────────────────────────────────
const PLANS = {
  starter: {
    label: 'Starter',
    price: 12,
    duration: 5,
    seconds: 30,
    description: '6 scenes · 30-second film',
    lsUrl: 'https://yourvisionvideo.lemonsqueezy.com/checkout/buy/fe254877-7211-4f60-ab83-4f3f844afb17',
  },
  premium: {
    label: 'Premium',
    price: 20,
    duration: 10,
    seconds: 60,
    description: '6 scenes · 60-second film',
    lsUrl: 'https://yourvisionvideo.lemonsqueezy.com/checkout/buy/6c401b6d-acfb-4a7e-893d-11338e7829dc',
  },
}

// ─── Review page ──────────────────────────────────────────────────────────────

export default function ReviewVision() {
  const router            = useRouter()
  const { id: projectId } = router.query
  const { user }          = useAuth()

  const [generations, setGenerations]   = useState([])
  const [project, setProject]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [approving, setApproving]       = useState(false)
  const [devBypassing, setDevBypassing] = useState(false)
  const [redoingId, setRedoingId]       = useState(null)
  const [error, setError]               = useState(null)
  const [genError, setGenError]         = useState(null)
  const [retrying, setRetrying]         = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const generationStartedRef            = React.useRef(false)
  const [selectedVersions, setSelectedVersions] = useState({})
  const [affirmations, setAffirmations]         = useState({})

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user || !projectId) return

    const [{ data: proj }, { data: gens }] = await Promise.all([
      supabase
        .from('vision_projects')
        .select('id, status, user_id, story_inputs')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('media_generations')
        .select('id, prompt_text, media_url, is_selected, revision_count, order_num, is_redo, created_at, affirmation, affirmation_enabled')
        .eq('vision_project_id', projectId)
        .order('order_num', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    setProject(proj)
    const list = gens ?? []

    const uniqueOrderNums = new Set(list.filter((g) => !g.is_redo).map((g) => g.order_num))
    const needsReindex = uniqueOrderNums.size === 1 && list.filter((g) => !g.is_redo).length > 1
    const normalized = needsReindex
      ? (() => { let idx = 0; return list.map((g) => g.is_redo ? g : { ...g, order_num: idx++ }) })()
      : list

    setGenerations(normalized)

    setAffirmations((prev) => {
      const next = { ...prev }
      normalized.forEach((g) => {
        if (next[g.id] === undefined) {
          next[g.id] = { text: g.affirmation ?? null, enabled: g.affirmation_enabled !== false }
        }
      })
      return next
    })

    setSelectedVersions((prev) => {
      const next = { ...prev }
      buildSlotMap(normalized).forEach((versions, orderNum) => {
        if (next[orderNum] == null) next[orderNum] = versions[0].id
      })
      return next
    })

    const allNowReady = normalized.filter(g => !g.is_redo).every(g => g.media_url)
    if (allNowReady) {
      setGenError(null)
    } else {
      const STALE_MS = 5 * 60 * 1000
      const staleStuck = normalized.some(
        (g) => !g.is_redo && !g.media_url && (Date.now() - new Date(g.created_at).getTime()) > STALE_MS
      )
      if (staleStuck) {
        setGenError('One or more images timed out. Click "Retry" — only the missing ones will be regenerated.')
      }
    }

    setLoading(false)
  }, [user, projectId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (loading || generationStartedRef.current) return
    const originals = generations.filter(g => !g.is_redo)

    // Prompts not ready yet — poll until generatePrompts completes in background
    if (originals.length === 0) {
      const t = setTimeout(() => loadData(), 4000)
      return () => clearTimeout(t)
    }

    if (originals.every(g => !g.media_url)) {
      generationStartedRef.current = true
      api.generateFlux(projectId)
        .then(({ flux_slots }) => api.generateFaceswap(projectId, flux_slots))
        .then(() => loadData())
        .catch(err => {
          console.error('Auto-generation failed:', err)
          setGenError('Image generation failed. Click "Retry" to try again.')
        })
    }
  }, [generations, loading, projectId, loadData])

  useEffect(() => {
    const originals = generations.filter((g) => !g.is_redo)
    if (!originals.some((g) => !g.media_url) || loading) return
    let pollCount = 0
    const interval = setInterval(() => {
      if (++pollCount >= 30) {
        clearInterval(interval)
        setGenError('Image generation timed out. Click "Retry" to regenerate missing ones.')
        return
      }
      loadData()
    }, 6000)
    return () => clearInterval(interval)
  }, [generations, loading, loadData, genError])

  function buildSlotMap(list) {
    const map = new Map()
    list.forEach((g) => {
      if (!map.has(g.order_num)) map.set(g.order_num, [])
      map.get(g.order_num).push(g)
    })
    return map
  }

  const handleRetry = async () => {
    setRetrying(true); setGenError(null)
    try {
      const { flux_slots } = await api.generateFlux(projectId)
      await api.generateFaceswap(projectId, flux_slots)
      await loadData()
    } catch (err) {
      setGenError(err.message ?? 'Image generation failed. Please try again.')
    } finally { setRetrying(false) }
  }

  const handleRedo = async (generationId, feedback) => {
    setRedoingId(generationId); setError(null)
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
      setError(err.message ?? 'Redo failed. Please try again.')
    } finally { setRedoingId(null) }
  }

  const handleApprove = async () => {
    setApproving(true); setError(null)
    try {
      const plan = PLANS[selectedPlan]
      const selectedIds = Object.values(selectedVersions)
      await Promise.all(
        selectedIds.map((id) => {
          const aff = affirmations[id]
          if (!aff) return Promise.resolve()
          return supabase.from('media_generations')
            .update({ affirmation: aff.text, affirmation_enabled: aff.enabled })
            .eq('id', id)
        })
      )
      await supabase.from('media_generations').update({ is_selected: true }).in('id', selectedIds)
      // Save plan into story_inputs and update status
      const newStoryInputs = { ...(project?.story_inputs ?? {}), plan: selectedPlan }
      const { error: updateError } = await supabase
        .from('vision_projects')
        .update({ status: 'Payment_Pending', story_inputs: newStoryInputs })
        .eq('id', projectId)
      if (updateError) throw updateError
      const checkoutUrl = new URL(plan.lsUrl)
      checkoutUrl.searchParams.set('checkout[custom][project_id]', projectId)
      checkoutUrl.searchParams.set('checkout[custom][user_id]', user.id)
      window.location.href = checkoutUrl.toString()
    } catch (err) {
      setError(err.message)
      setApproving(false)
    }
  }

  const handleDevBypass = async () => {
    setDevBypassing(true); setError(null)
    try {
      const selectedIds = Object.values(selectedVersions)
      if (selectedIds.length !== totalSlots)
        throw new Error(`Expected ${totalSlots} selections but got ${selectedIds.length}.`)
      await supabase.from('media_generations').update({ is_selected: true }).in('id', selectedIds)
      await api.generateVideo(projectId, selectedIds, selectedPlan)
      router.push(`/processing/${projectId}`)
    } catch (err) {
      setError(err.message ?? 'Video generation failed.')
      setDevBypassing(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C5BFB8', fontSize: '0.9rem' }}>
        Project not found.
      </div>
    )
  }

  const originsExist = generations.filter(g => !g.is_redo).length > 0
  if (!originsExist) {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <Spinner />
          <p style={{ color: '#C5BFB8', fontSize: '0.88rem', fontWeight: 300, letterSpacing: '0.04em' }}>Preparing your scenes…</p>
        </div>
      </>
    )
  }

  const slotMap   = buildSlotMap(generations)
  const originals = generations.filter((g) => !g.is_redo)
  const allReady  = originals.length > 0 && originals.every((g) => g.media_url)
  const totalSlots = originals.length > 0 ? Math.max(...originals.map((g) => g.order_num)) + 1 : 6
  const slotEntries = Array.from({ length: totalSlots }, (_, i) => ({
    orderNum: i,
    versions: slotMap.get(i) ?? [],
  }))

  return (
    <>
      <Head>
        <title>Your Vision, Revealed — YourVision</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,200;0,300;1,200;1,300&display=swap" rel="stylesheet" />
      </Head>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fade{from{opacity:0}to{opacity:1}} @media(max-width:640px){.scene-grid{grid-template-columns:1fr!important}}`}</style>

      <div style={{ minHeight: '100vh', background: '#0A0908', color: '#F4F1EA', fontFamily: "'General Sans', system-ui, sans-serif" }}>

        {/* Nav */}
        <nav style={{
          borderBottom: '1px solid #1F1D1A', padding: '0 40px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#C5BFB8', fontSize: '0.8rem', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
        </nav>

        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '56px 40px 80px' }}>

          {/* Heading */}
          <div style={{ marginBottom: '48px' }}>
            <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '16px' }}>
              Your Vision
            </span>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em', marginBottom: '10px' }}>
              Your vision, <em style={{ fontStyle: 'italic', color: '#C9A961' }}>revealed.</em>
            </h1>
            <p style={{ color: '#C5BFB8', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7 }}>
              Review each scene. Redo any one — then pick V1 or V2 before approving.
            </p>
          </div>

          {/* Generating banner */}
          {!allReady && !genError && (
            <div style={{
              marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 20px', border: '1px solid rgba(201,169,97,0.2)',
              borderRadius: '4px', background: 'rgba(201,169,97,0.04)',
              fontSize: '0.85rem', color: '#C9A961', animation: 'fade 0.4s ease',
            }}>
              <Spinner size={16} />
              Images are being generated. This page updates automatically.
            </div>
          )}

          {/* Error banner */}
          {genError && (
            <div style={{
              marginBottom: '32px', padding: '16px 20px',
              border: '1px solid rgba(224,112,112,0.25)', borderRadius: '4px',
              background: 'rgba(224,112,112,0.06)', animation: 'fade 0.4s ease',
            }}>
              <p style={{ fontSize: '0.85rem', color: '#E07070', marginBottom: '12px', lineHeight: 1.6 }}>{genError}</p>
              <button
                onClick={handleRetry}
                disabled={retrying}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '8px 20px', border: '1px solid rgba(224,112,112,0.4)',
                  color: '#E07070', background: 'transparent', fontSize: '0.8rem',
                  borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
                  opacity: retrying ? 0.5 : 1,
                }}
              >
                {retrying ? <><Spinner size={14} color="#E07070" />Retrying...</> : '↺ Retry Generation'}
              </button>
            </div>
          )}

          {/* Image grid */}
          <div className="scene-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px', marginBottom: '48px',
          }}>
            {slotEntries.map(({ orderNum, versions }) =>
              versions.length > 0 ? (
                <ImageCard
                  key={orderNum}
                  versions={versions}
                  selectedId={selectedVersions[orderNum] ?? versions[0]?.id}
                  onSelectVersion={(id) => setSelectedVersions((prev) => ({ ...prev, [orderNum]: id }))}
                  onRedo={handleRedo}
                  redoing={versions.some((v) => redoingId === v.id)}
                  affirmation={affirmations[selectedVersions[orderNum] ?? versions[0]?.id]}
                  onAffirmationChange={(text) => {
                    const id = selectedVersions[orderNum] ?? versions[0]?.id
                    setAffirmations((prev) => ({ ...prev, [id]: { ...prev[id], text } }))
                  }}
                  onAffirmationToggle={(enabled) => {
                    const id = selectedVersions[orderNum] ?? versions[0]?.id
                    setAffirmations((prev) => ({ ...prev, [id]: { ...prev[id], enabled } }))
                  }}
                />
              ) : (
                <div key={`sk-${orderNum}`} style={{
                  background: '#0F0E0C', border: '1px solid #1F1D1A', borderRadius: '4px', overflow: 'hidden',
                }}>
                  <div style={{ aspectRatio: '3/4', background: '#0A0908', animation: 'pulse 2s ease-in-out infinite' }} />
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ height: '6px', background: '#1F1D1A', borderRadius: '2px', width: '70%' }} />
                    <div style={{ height: '6px', background: '#1F1D1A', borderRadius: '2px', width: '50%' }} />
                  </div>
                </div>
              )
            )}
          </div>

          {/* Plan picker */}
          <div style={{ marginBottom: '32px', borderTop: '1px solid #1F1D1A', paddingTop: '40px' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '20px' }}>
              Choose your film
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {Object.entries(PLANS).map(([key, plan]) => {
                const active = selectedPlan === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    style={{
                      border: `1px solid ${active ? '#C9A961' : '#1F1D1A'}`,
                      background: active ? 'rgba(201,169,97,0.06)' : '#0F0E0C',
                      borderRadius: '4px', padding: '24px 28px', cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                      transition: 'border-color 200ms, background 200ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: active ? '#C9A961' : '#C5BFB8' }}>
                        {plan.label}
                      </span>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.6rem', fontWeight: 200, color: active ? '#F4F1EA' : '#C5BFB8', lineHeight: 1 }}>
                        ${plan.price}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: active ? '#C5BFB8' : '#4A4640', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
                      {plan.description}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: active ? '#8A847E' : '#2A2520', marginTop: '6px', margin: 0 }}>
                      Each scene: {plan.duration}s · Total: {plan.seconds}s
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p style={{
              marginBottom: '24px', fontSize: '0.85rem', color: '#E07070',
              background: 'rgba(224,112,112,0.06)', border: '1px solid rgba(224,112,112,0.2)',
              borderRadius: '4px', padding: '12px 16px', lineHeight: 1.5,
            }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #1F1D1A', paddingTop: '32px' }}>
            <div>
              <p style={{ fontSize: '0.95rem', color: '#F4F1EA', fontWeight: 400, marginBottom: '4px' }}>Happy with your vision?</p>
              <p style={{ fontSize: '0.82rem', color: '#C5BFB8', fontWeight: 300 }}>
                Approving locks in your scenes and takes you to checkout.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* DEV bypass */}
              <button
                onClick={handleDevBypass}
                disabled={!allReady || devBypassing || approving || !!redoingId}
                style={{
                  padding: '10px 20px', border: '1px solid rgba(201,169,97,0.3)',
                  color: '#C9A961', background: 'rgba(201,169,97,0.05)',
                  fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                  fontFamily: 'inherit', opacity: (!allReady || devBypassing || approving || !!redoingId) ? 0.4 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                }}
              >
                {devBypassing ? <><Spinner size={14} />Generating...</> : '🛠 [DEV] Skip Payment'}
              </button>

              {/* Approve */}
              <button
                onClick={handleApprove}
                disabled={!allReady || approving || devBypassing || !!redoingId}
                style={{
                  padding: '12px 36px', border: '1px solid #C9A961',
                  color: '#C9A961', background: 'transparent',
                  fontSize: '0.85rem', fontWeight: 400, letterSpacing: '0.14em',
                  textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer',
                  fontFamily: 'inherit',
                  opacity: (!allReady || approving || devBypassing || !!redoingId) ? 0.4 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  transition: 'color 300ms, border-color 300ms',
                }}
                onMouseEnter={e => { if (allReady && !approving) { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' } }}
                onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
              >
                {approving
                  ? <><Spinner size={16} />Processing...</>
                  : `Continue — $${PLANS[selectedPlan].price} ✦`
                }
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
