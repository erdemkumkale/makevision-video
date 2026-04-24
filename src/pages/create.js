/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

// ─── Image resize utility ─────────────────────────────────────────────────────

function resizeImageFile(file, maxPx = 1536) {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width <= maxPx && height <= maxPx) {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0)
        canvas.toBlob(blob => resolve(new File([blob], 'selfie.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
        return
      }
      if (width > height) { height = Math.round(height * maxPx / width); width = maxPx }
      else                 { width  = Math.round(width  * maxPx / height); height = maxPx }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(new File([blob], 'selfie.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
    }
    img.src = url
  })
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male'   },
  { value: 'female', label: 'Female' },
]

const AGE_OPTIONS = [
  { value: '20s', label: '20s' },
  { value: '30s', label: '30s' },
  { value: '40s', label: '40s' },
  { value: '50s', label: '50s+' },
]

const SUBMIT_STAGES = [
  'Uploading your photo…',
  'Saving your vision…',
  'Crafting your scenes with AI…',
  'Starting your vision…',
]

// ─── Shared styles ────────────────────────────────────────────────────────────

const goldButton = {
  padding: '13px 36px', border: '1px solid #C9A961', background: 'transparent',
  color: '#C9A961', fontSize: '0.78rem', fontWeight: 400, letterSpacing: '0.14em',
  textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px',
  fontFamily: "'General Sans','Inter',-apple-system,sans-serif",
  transition: 'color 300ms, border-color 300ms',
}

const ghostButton = {
  padding: '13px 24px', border: '1px solid #1F1D1A', background: 'transparent',
  color: '#6B6560', fontSize: '0.75rem', fontWeight: 400, letterSpacing: '0.12em',
  textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px',
  fontFamily: "'General Sans','Inter',-apple-system,sans-serif",
  transition: 'color 300ms, border-color 300ms',
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepDots = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '48px' }}>
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <div key={i} style={{
        height: '2px', borderRadius: '1px',
        width: i === current ? '32px' : i < current ? '32px' : '16px',
        background: i <= current ? '#C9A961' : '#1F1D1A',
        transition: 'width 400ms, background 400ms',
      }} />
    ))}
    <span style={{ fontSize: '0.78rem', color: '#6B6560', letterSpacing: '0.1em', marginLeft: '4px' }}>
      {current + 1} / {TOTAL_STEPS}
    </span>
  </div>
)

// ─── Step 1: Selfie Upload ────────────────────────────────────────────────────

const SelfieUpload = ({ file, setFile, consent, setConsent }) => {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const preview = file ? URL.createObjectURL(file) : null

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type.startsWith('image/')) setFile(dropped)
  }, [setFile])

  const handleFile = (e) => {
    const picked = e.target.files[0]
    if (picked?.type.startsWith('image/')) setFile(picked)
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.6rem,4vw,2rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', marginBottom: '8px' }}>
        Your face, <em style={{ fontStyle: 'italic', color: '#C9A961' }}>your vision.</em>
      </h2>
      <p style={{ fontSize: '0.88rem', color: '#8A857C', fontWeight: 300, lineHeight: 1.7, marginBottom: '32px' }}>
        Upload a clear, front-facing photo. This anchors you as the hero of your story.
      </p>

      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          cursor: 'pointer', border: `1px dashed ${dragging ? '#C9A961' : file ? '#4A4640' : '#1F1D1A'}`,
          borderRadius: '4px', background: dragging ? 'rgba(201,169,97,0.04)' : '#0F0E0C',
          minHeight: '260px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px',
          transition: 'border-color 300ms, background 300ms',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="selfie preview"
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '1px solid #C9A961' }} />
            <p style={{ fontSize: '0.82rem', color: '#C9A961', fontWeight: 400 }}>{file.name}</p>
            <p style={{ fontSize: '0.82rem', color: '#6B6560' }}>Click to change</p>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid #1F1D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 24, height: 24, color: '#4A4640' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.92rem', color: '#8A857C', fontWeight: 400, marginBottom: '6px' }}>Drop your photo here</p>
              <p style={{ fontSize: '0.82rem', color: '#6B6560' }}>or click to browse — JPG, PNG, WEBP</p>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {file && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '20px', cursor: 'pointer' }}
          onClick={() => setConsent(v => !v)}>
          <div style={{
            marginTop: '2px', flexShrink: 0, width: '18px', height: '18px',
            border: `1px solid ${consent ? '#C9A961' : '#1F1D1A'}`,
            borderRadius: '2px', background: consent ? 'rgba(201,169,97,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 200ms, background 200ms',
          }}>
            {consent && (
              <svg style={{ width: 10, height: 10, color: '#C9A961' }} fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6B6560', lineHeight: 1.7, fontWeight: 300 }}>
            I confirm this photo is of me and I have the right to use it. I understand that using another person&apos;s likeness without consent may be illegal, and I take full responsibility.
          </p>
        </label>
      )}
    </div>
  )
}

// ─── Gender & Age Picker ──────────────────────────────────────────────────────

const SubjectPicker = ({ gender, setGender, age, setAge }) => (
  <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div>
      <p style={{ fontSize: '0.75rem', color: '#6B6560', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>I am a</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {GENDER_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setGender(opt.value)} style={{
            flex: 1, padding: '10px', border: `1px solid ${gender === opt.value ? '#C9A961' : '#1F1D1A'}`,
            background: gender === opt.value ? 'rgba(201,169,97,0.08)' : 'transparent',
            color: gender === opt.value ? '#C9A961' : '#6B6560',
            fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer', borderRadius: '4px',
            fontFamily: 'inherit', transition: 'all 200ms',
          }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
    <div>
      <p style={{ fontSize: '0.75rem', color: '#6B6560', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Age range</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {AGE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setAge(opt.value)} style={{
            flex: 1, padding: '10px', border: `1px solid ${age === opt.value ? '#C9A961' : '#1F1D1A'}`,
            background: age === opt.value ? 'rgba(201,169,97,0.08)' : 'transparent',
            color: age === opt.value ? '#C9A961' : '#6B6560',
            fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer', borderRadius: '4px',
            fontFamily: 'inherit', transition: 'all 200ms',
          }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  </div>
)

// ─── Step 2: Dream Form ───────────────────────────────────────────────────────

const DreamForm = ({ dream, setDream }) => (
  <div>
    <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.6rem,4vw,2rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', marginBottom: '8px' }}>
      Describe your <em style={{ fontStyle: 'italic', color: '#C9A961' }}>dream life.</em>
    </h2>
    <p style={{ fontSize: '0.88rem', color: '#8A857C', fontWeight: 300, lineHeight: 1.7, marginBottom: '28px' }}>
      Write freely. Where are you, how does your life look and feel? The more vivid, the more personal the film.
    </p>
    <textarea
      value={dream}
      onChange={(e) => setDream(e.target.value)}
      rows={9}
      placeholder={`I wake up in a beautiful home overlooking the ocean. I run a company I love, surrounded by brilliant people. I travel every few weeks, I'm in the best shape of my life, financially free, and deeply at peace…`}
      autoFocus
      style={{
        width: '100%', background: '#0F0E0C', border: '1px solid #1F1D1A',
        borderRadius: '4px', color: '#F4F1EA', fontSize: '0.88rem', fontWeight: 300,
        lineHeight: 1.8, padding: '16px', fontFamily: 'inherit', resize: 'none',
        outline: 'none', transition: 'border-color 300ms',
      }}
      onFocus={e => e.target.style.borderColor = '#4A4640'}
      onBlur={e => e.target.style.borderColor = '#1F1D1A'}
    />
    <p style={{ fontSize: '0.82rem', color: '#6B6560', marginTop: '8px' }}>
      {dream.length} characters — aim for 100+ for best results
    </p>
  </div>
)

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

const ReviewStep = ({ file, dream, submitting, submitStage }) => {
  const preview = file ? URL.createObjectURL(file) : null
  return (
    <div>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.6rem,4vw,2rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', marginBottom: '8px' }}>
        Ready to <em style={{ fontStyle: 'italic', color: '#C9A961' }}>manifest.</em>
      </h2>
      <p style={{ fontSize: '0.88rem', color: '#8A857C', fontWeight: 300, lineHeight: 1.7, marginBottom: '28px' }}>
        Review your vision before we begin.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Selfie */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0F0E0C', border: '1px solid #1F1D1A', borderRadius: '4px', padding: '16px' }}>
          {preview
            ? <img src={preview} alt="selfie" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #C9A961' }} />
            : <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #1F1D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: 18, height: 18, color: '#4A4640' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
          }
          <div>
            <p style={{ fontSize: '0.82rem', color: '#F4F1EA', fontWeight: 400, marginBottom: '2px' }}>{file?.name ?? 'No photo uploaded'}</p>
            <p style={{ fontSize: '0.78rem', color: '#6B6560' }}>Face reference</p>
          </div>
          {file && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#7EC99A' }} />}
        </div>

        {/* Dream */}
        <div style={{ background: '#0F0E0C', border: '1px solid #1F1D1A', borderRadius: '4px', padding: '16px' }}>
          <p style={{ fontSize: '0.75rem', color: '#6B6560', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Vision</p>
          <p style={{ fontSize: '0.88rem', color: '#8A857C', fontWeight: 300, lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {dream || <span style={{ fontStyle: 'italic', color: '#6B6560' }}>No description entered.</span>}
          </p>
        </div>

        {/* What happens next */}
        <div style={{ background: 'rgba(201,169,97,0.04)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '4px', padding: '16px' }}>
          <p style={{ fontSize: '0.75rem', color: '#C9A961', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>What happens next</p>
          <p style={{ fontSize: '0.85rem', color: '#8A857C', fontWeight: 300, lineHeight: 1.75 }}>
            Our AI creates <span style={{ color: '#F4F1EA', fontWeight: 400 }}>6 cinematic scenes</span> with your face composited into each one. Review the results — if you&apos;re happy, proceed to checkout and receive your <span style={{ color: '#F4F1EA', fontWeight: 400 }}>1-minute vision video</span>.
          </p>
        </div>
      </div>

      {submitting && (
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#C9A961', fontSize: '0.82rem' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #C9A961', borderTopColor: 'transparent', animation: 'spin 1.2s linear infinite', flexShrink: 0 }} />
          {SUBMIT_STAGES[submitStage] ?? 'Processing…'}
        </div>
      )}
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function CreateVision() {
  const { user } = useAuth()
  const router   = useRouter()

  const [step, setStep]               = useState(0)
  const [file, setFile]               = useState(null)
  const [consent, setConsent]         = useState(false)
  const [gender, setGender]           = useState('male')
  const [age, setAge]                 = useState('30s')
  const [dream, setDream]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitStage, setSubmitStage] = useState(0)
  const [error, setError]             = useState(null)

  const canAdvance = () => {
    if (step === 0) return !!file && consent
    if (step === 1) return dream.trim().length >= 20
    return true
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true); setSubmitStage(0); setError(null)
    try {
      let selfieUrl = null
      if (file) {
        const resizedFile = await resizeImageFile(file, 1536)
        const path = `selfies/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('vision-assets').upload(path, resizedFile, { upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('vision-assets').getPublicUrl(path)
        selfieUrl = urlData.publicUrl
      }
      setSubmitStage(1)
      const { data: project, error: insertError } = await supabase
        .from('vision_projects')
        .insert([{ user_id: user.id, status: 'Draft', selfie_url: selfieUrl, story_inputs: { custom_story: dream.trim(), scene_count: 6, gender, age } }])
        .select().single()
      if (insertError) throw insertError
      setSubmitStage(2)
      await api.generatePrompts(project.id)
      setSubmitStage(3)
      await api.startGeneration(project.id)
      router.push(`/review/${project.id}`)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err.message ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>YourVision — Create</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0A0908', color: '#F4F1EA', fontFamily: "'General Sans','Inter',-apple-system,sans-serif", fontWeight: 300, display: 'flex', flexDirection: 'column' }}>

        {/* Nav */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: '64px',
          background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1F1D1A',
        }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#6B6560', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit', transition: 'color 200ms', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#F4F1EA'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B6560'}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
        </header>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '56px 24px' }}>
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <StepDots current={step} />

            {step === 0 && (
              <>
                <SelfieUpload file={file} setFile={setFile} consent={consent} setConsent={setConsent} />
                <SubjectPicker gender={gender} setGender={setGender} age={age} setAge={setAge} />
              </>
            )}
            {step === 1 && <DreamForm dream={dream} setDream={setDream} />}
            {step === 2 && (
              <ReviewStep file={file} dream={dream} submitting={submitting} submitStage={submitStage} />
            )}

            {error && (
              <p style={{ marginTop: '16px', fontSize: '0.82rem', color: '#E07070', background: 'rgba(224,112,112,0.08)', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '4px', padding: '12px 16px', lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '48px' }}>
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                style={{ ...ghostButton, opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F4F1EA'; e.currentTarget.style.borderColor = '#4A4640' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#4A4640'; e.currentTarget.style.borderColor = '#1F1D1A' }}
              >
                Back
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  style={{ ...goldButton, opacity: canAdvance() ? 1 : 0.35, cursor: canAdvance() ? 'pointer' : 'not-allowed' }}
                  onMouseEnter={e => { if (canAdvance()) { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' } }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ ...goldButton, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  onMouseEnter={e => { if (!submitting) { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' } }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
                >
                  {submitting ? (
                    <>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #C9A961', borderTopColor: 'transparent', animation: 'spin 1.2s linear infinite', display: 'inline-block' }} />
                      Manifesting…
                    </>
                  ) : 'Generate My Vision ✦'}
                </button>
              )}
            </div>
          </div>
        </div>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )
}
