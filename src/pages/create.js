/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
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

const REF_CATEGORIES = [
  { key: 'home',      label: 'Dream Home',     emoji: '🏠' },
  { key: 'car',       label: 'Dream Car',       emoji: '🚗' },
  { key: 'travel',    label: 'Dream Location',  emoji: '🌍' },
  { key: 'lifestyle', label: 'Lifestyle',       emoji: '✨' },
]

const SCENE_OPTIONS = [
  { count: 6,  label: 'Short',     duration: '30s' },
  { count: 9,  label: 'Standard',  duration: '45s' },
  { count: 12, label: 'Full Film', duration: '1 min' },
]

const TOTAL_STEPS = 3

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepDots = ({ current }) => (
  <div className="flex items-center gap-2 mb-10">
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <React.Fragment key={i}>
        <div className={`h-1.5 rounded-full transition-all duration-500
          ${i < current ? 'w-8 bg-glow' : i === current ? 'w-8 bg-glow-soft shadow-glow-sm' : 'w-4 bg-border'}`}
        />
      </React.Fragment>
    ))}
    <span className="text-xs text-gray-600 ml-2">{current + 1} / {TOTAL_STEPS}</span>
  </div>
)

// ─── Step 1: Selfie Upload ────────────────────────────────────────────────────

const SelfieUpload = ({ file, setFile }) => {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const preview = file ? URL.createObjectURL(file) : null

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type.startsWith('image/')) setFile(dropped)
  }, [setFile])

  const handleFile = (e) => {
    const picked = e.target.files[0]
    if (picked?.type.startsWith('image/')) setFile(picked)
  }

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-semibold text-white mb-1">Your Face, Your Vision</h2>
      <p className="text-gray-500 text-sm mb-8">
        Upload a clear, front-facing photo. This anchors you as the hero of your story.
      </p>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
          flex flex-col items-center justify-center gap-4 p-10
          ${dragging ? 'border-glow bg-glow/10 shadow-glow'
            : file ? 'border-glow-dim bg-glow-dim/10'
            : 'border-border bg-panel hover:border-muted hover:bg-surface'}`}
        style={{ minHeight: 280 }}
      >
        {preview ? (
          <>
            <img src={preview} alt="selfie preview"
              className="w-36 h-36 rounded-full object-cover border-2 border-glow shadow-glow" />
            <p className="text-glow-soft text-sm font-medium">{file.name}</p>
            <p className="text-gray-600 text-xs">Click to change</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-glow-dim/30 border border-glow-dim
                            flex items-center justify-center shadow-glow-sm">
              <svg className="w-7 h-7 text-glow-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">Drop your photo here</p>
              <p className="text-gray-600 text-sm mt-1">or click to browse — JPG, PNG, WEBP</p>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

// ─── Gender & Age Picker ──────────────────────────────────────────────────────

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

const SubjectPicker = ({ gender, setGender, age, setAge }) => (
  <div className="mt-6 space-y-4">
    <div>
      <p className="text-sm font-medium text-gray-300 mb-2">I am a</p>
      <div className="flex gap-3">
        {GENDER_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setGender(opt.value)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
              ${gender === opt.value
                ? 'bg-glow/20 border-glow text-white shadow-glow-sm'
                : 'bg-panel border-border text-gray-500 hover:border-glow-dim hover:text-gray-300'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-300 mb-2">Age range</p>
      <div className="flex gap-3">
        {AGE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setAge(opt.value)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
              ${age === opt.value
                ? 'bg-glow/20 border-glow text-white shadow-glow-sm'
                : 'bg-panel border-border text-gray-500 hover:border-glow-dim hover:text-gray-300'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  </div>
)


// ─── Step 2: Dream Form ───────────────────────────────────────────────────────

const DreamForm = ({ dream, setDream, sceneCount, setSceneCount }) => (
  <div className="animate-slide-up">
    <h2 className="text-2xl font-semibold text-white mb-1">Describe Your Dream Life</h2>
    <p className="text-gray-500 text-sm mb-6">
      Write freely. What does your ideal life look, feel, and sound like? The more vivid, the better.
    </p>

    <textarea
      value={dream}
      onChange={(e) => setDream(e.target.value)}
      rows={8}
      placeholder={`I wake up in a beautiful home overlooking the ocean. I run a company I love, surrounded by brilliant people. I travel every few weeks, I'm in the best shape of my life, financially free, and deeply at peace...`}
      className="input-field resize-none text-sm w-full leading-relaxed"
      autoFocus
    />
    <p className="text-xs text-gray-600 mt-2 mb-8">
      {dream.length} characters — aim for 100+ for best results
    </p>

    {/* Scene count picker */}
    <div>
      <p className="text-sm font-medium text-gray-300 mb-3">How long should your film be?</p>
      <div className="flex gap-3">
        {SCENE_OPTIONS.map(opt => (
          <button
            key={opt.count}
            onClick={() => setSceneCount(opt.count)}
            className={`flex-1 py-3 px-2 rounded-xl border text-center transition-all duration-150
              ${sceneCount === opt.count
                ? 'bg-glow/20 border-glow text-white shadow-glow-sm'
                : 'bg-panel border-border text-gray-500 hover:border-glow-dim hover:text-gray-300'
              }`}
          >
            <div className="text-sm font-medium">{opt.label}</div>
            <div className="text-xs mt-0.5 opacity-60">{opt.count} scenes · {opt.duration}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
)

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

const ReviewStep = ({ file, dream, sceneCount, submitting, submitStage }) => {
  const preview = file ? URL.createObjectURL(file) : null
  const selectedOption = SCENE_OPTIONS.find(o => o.count === sceneCount)

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-semibold text-white mb-1">Ready to Manifest</h2>
      <p className="text-gray-500 text-sm mb-8">
        Review your vision before we begin the transformation.
      </p>
      <div className="space-y-4">
        {/* Selfie */}
        <div className="flex items-center gap-4 bg-panel border border-border rounded-xl p-4">
          {preview
            ? <img src={preview} alt="selfie" className="w-12 h-12 rounded-full object-cover border border-glow-dim" />
            : <div className="w-12 h-12 rounded-full bg-muted/30 border border-border flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
          }
          <div>
            <p className="text-sm text-gray-200 font-medium">{file?.name ?? 'No photo uploaded'}</p>
            <p className="text-xs text-gray-600">Face reference</p>
          </div>
          {file && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />}
        </div>

        {/* Dream */}
        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Vision</p>
          <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
            {dream || <span className="text-gray-600 italic">No description entered.</span>}
          </p>
        </div>

        {/* Film length */}
        <div className="bg-panel border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Film Length</p>
            <p className="text-sm text-gray-200 font-medium">{selectedOption?.label} — {selectedOption?.duration}</p>
          </div>
          <span className="text-xs text-glow-soft bg-glow-dim/30 border border-glow-dim px-2.5 py-1 rounded-full">
            {sceneCount} scenes
          </span>
        </div>
      </div>

      {submitting && (
        <div className="mt-6 flex items-center gap-3 text-glow-soft text-sm animate-fade-in">
          <div className="w-4 h-4 border-2 border-glow-soft border-t-transparent rounded-full animate-spin flex-shrink-0" />
          {SUBMIT_STAGES[submitStage] ?? 'Processing...'}
        </div>
      )}
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const SUBMIT_STAGES = [
  'Uploading your photo...',
  'Saving your vision...',
  'Analyzing your story with AI...',
  'Generating your scenes... (this takes ~2 minutes)',
  'Adding your face to each scene...',
  'Almost ready...',
]

export default function CreateVision() {
  const { user } = useAuth()
  const router   = useRouter()

  const [step, setStep]           = useState(0)
  const [file, setFile]           = useState(null)
  const [gender, setGender]       = useState('male')
  const [age, setAge]             = useState('30s')
  const [dream, setDream]         = useState('')
  const [sceneCount, setSceneCount] = useState(6)
  const [submitting, setSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState(0)
  const [error, setError]         = useState(null)

  const canAdvance = () => {
    if (step === 0) return !!file
    if (step === 1) return dream.trim().length >= 20
    return true
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setSubmitStage(0)
    setError(null)

    try {
      // 1. Upload selfie
      let selfieUrl = null
      if (file) {
        const resizedFile = await resizeImageFile(file, 1536)
        const path = `selfies/${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('vision-assets')
          .upload(path, resizedFile, { upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('vision-assets').getPublicUrl(path)
        selfieUrl = urlData.publicUrl
      }

      // 2. Insert project
      setSubmitStage(1)
      const { data: project, error: insertError } = await supabase
        .from('vision_projects')
        .insert([{
          user_id:      user.id,
          status:       'Draft',
          selfie_url:   selfieUrl,
          story_inputs: { custom_story: dream.trim(), scene_count: sceneCount, gender, age },
        }])
        .select()
        .single()
      if (insertError) throw insertError

      // 3. Generate prompts
      setSubmitStage(2)
      await api.generatePrompts(project.id)

      // 4. Generate Flux images (synchronous, ~2min)
      setSubmitStage(3)
      const { flux_slots } = await api.generateFlux(project.id)

      // 5. Generate faceswap (synchronous, ~1.5min)
      setSubmitStage(4)
      await api.generateFaceswap(project.id, flux_slots)

      // 6. Redirect to review
      setSubmitStage(5)
      router.push(`/review/${project.id}`)
    } catch (err) {
      console.error('Submission error:', err)
      setError(err.message ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2 text-sm">
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

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <StepDots current={step} />

          {step === 0 && (
            <>
              <SelfieUpload file={file} setFile={setFile} />
              <SubjectPicker gender={gender} setGender={setGender} age={age} setAge={setAge} />
            </>
          )}
          {step === 1 && (
            <DreamForm
              dream={dream} setDream={setDream}
              sceneCount={sceneCount} setSceneCount={setSceneCount}
            />
          )}
          {step === 2 && (
            <ReviewStep
              file={file} dream={dream} sceneCount={sceneCount}
              submitting={submitting} submitStage={submitStage}
            />
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between mt-10">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white
                         border border-border hover:border-muted transition-all
                         disabled:opacity-0 disabled:pointer-events-none"
            >
              Back
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="btn-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-glow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Manifesting...' : 'Generate My Vision ✦'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
