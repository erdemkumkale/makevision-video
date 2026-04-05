/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

// ─── Image resize utility ─────────────────────────────────────────────────────
// PiAPI face swap maksimum 2048x2048 kabul ediyor.
// Telefon kameraları 4000x3000+ çekebiliyor — yüklemeden önce küçült.

function resizeImageFile(file, maxPx = 1536) {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width <= maxPx && height <= maxPx) {
        URL.revokeObjectURL(url)
        // Zaten küçük — JPEG olarak yeniden encode et
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0)
        canvas.toBlob(blob => resolve(new File([blob], 'selfie.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
        return
      }
      // Oranı koru, uzun kenarı maxPx yap
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

const LIFE_AREAS = [
  {
    key: 'career',
    label: 'Career',
    emoji: '💼',
    tags: [
      'Remote Nomad', 'High-Impact CEO', 'Successful Entrepreneur',
      'Respected Expert', 'Creative Artist', 'Community Leader',
      'Relaxed 9-to-5', 'Early Retirement',
    ],
    placeholder: 'Leading a team at a company I love, doing work that matters...',
  },
  {
    key: 'relationships',
    label: 'Relationships',
    emoji: '❤️',
    tags: [
      'Deep Romantic Partnership', 'Strong Family Bonds',
      'Vibrant Social Circle', 'Peaceful Solitude',
      'Mentorship & Guidance', 'Chosen Family',
      'Playful Friendships', 'Soulmate Connection',
    ],
    placeholder: 'Surrounded by people who truly see me, deep connections...',
  },
  {
    key: 'health',
    label: 'Health',
    emoji: '⚡',
    tags: [
      'Peak Athletic Fitness', 'Holistic Wellness',
      'Rejuvenated Youthfulness', 'Healing & Recovery',
      'Mental Clarity', 'Flexible & Mobile Body',
      'Restful Deep Sleep', 'Vibrant Energy',
    ],
    placeholder: 'Waking up energised, strong body, clear mind...',
  },
  {
    key: 'wealth',
    label: 'Wealth',
    emoji: '💎',
    tags: [
      'Luxurious Lifestyle', 'Financial Freedom',
      'Philanthropic Abundance', 'Minimalist Security',
      'Passive Income Streams', 'Debt-Free Living',
      'Generational Wealth', 'Impact Investing',
    ],
    placeholder: 'Financial freedom, abundance flowing naturally...',
  },
  {
    key: 'personal_growth',
    label: 'Personal Growth',
    emoji: '🌱',
    tags: [
      'Spiritual Awakening', 'Continuous Learner',
      'Overcoming Fears', 'Creative Mastery',
      'Emotional Intelligence', 'Disciplined Habits',
      'Authentic Self-Expression', 'Inner Peace',
    ],
    placeholder: 'Continuously evolving, learning, becoming my best self...',
  },
  {
    key: 'adventure',
    label: 'Adventure',
    emoji: '🌍',
    tags: [
      'Exploring Hidden Gems', 'Adrenaline Junkie',
      'Cultural Immersion', 'Luxury Travel',
      'Nature & Wilderness', 'Futuristic Exploration',
      'Spiritual Pilgrimages', 'Culinary Tours',
    ],
    placeholder: 'Exploring new places, saying yes to life...',
  },
]

// Referans görsel kategorileri
const REF_CATEGORIES = [
  { key: 'home',     label: 'Dream Home',     emoji: '🏠' },
  { key: 'car',      label: 'Dream Car',       emoji: '🚗' },
  { key: 'travel',   label: 'Dream Location',  emoji: '🌍' },
  { key: 'lifestyle',label: 'Lifestyle',       emoji: '✨' },
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

// ─── Reference Images Upload ──────────────────────────────────────────────────

const ReferenceImages = ({ refImages, setRefImages }) => {
  const inputRefs = useRef({})

  const handleFile = (key, e) => {
    const file = e.target.files[0]
    if (!file?.type.startsWith('image/')) return
    setRefImages(prev => ({
      ...prev,
      [key]: { file, preview: URL.createObjectURL(file) }
    }))
  }

  const removeImage = (key) => {
    setRefImages(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium text-gray-300">Inspiration Images</p>
        <span className="text-xs text-gray-600 bg-surface border border-border px-2 py-0.5 rounded-full">Optional</span>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Add images of your dream home, car, or destination — the AI will place you there.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {REF_CATEGORIES.map(({ key, label, emoji }) => {
          const img = refImages[key]
          return (
            <div key={key} className="relative">
              {img ? (
                <div className="relative rounded-xl overflow-hidden border border-glow-dim aspect-square">
                  <img src={img.preview} alt={label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity
                                  flex items-center justify-center">
                    <button
                      onClick={() => removeImage(key)}
                      className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-xs text-gray-300">
                    {emoji} {label}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => inputRefs.current[key]?.click()}
                  className="w-full aspect-square rounded-xl border border-dashed border-border
                             bg-panel hover:border-glow-dim hover:bg-surface transition-all
                             flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:text-gray-400"
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs font-medium">{label}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <input
                ref={el => inputRefs.current[key] = el}
                type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile(key, e)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Life Area Box ────────────────────────────────────────────────────────────

const LifeAreaBox = ({ area, selectedTags, customText, onTagToggle, onCustomChange }) => {
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
        <span className="text-base leading-none">{area.emoji}</span>
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{area.label}</span>
        {selectedTags.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-glow/20 text-glow-soft border border-glow-dim ml-1">
            {selectedTags.length}
          </span>
        )}
      </div>

      {/* Body: tags primary, details optional */}
      <div className="p-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {area.tags.map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                  ${active
                    ? 'bg-glow/20 border-glow text-white shadow-glow-sm'
                    : 'bg-panel border-border text-gray-500 hover:border-glow-dim hover:text-gray-300'
                  }`}
              >
                {tag}
              </button>
            )
          })}
        </div>

        {/* "Add details" toggle — only show if user wants to add more */}
        {!showDetails && !customText ? (
          <button
            onClick={() => setShowDetails(true)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 pt-0.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add specific details...
          </button>
        ) : (
          <textarea
            value={customText}
            onChange={(e) => onCustomChange(e.target.value)}
            rows={2}
            placeholder={area.placeholder}
            className="input-field resize-none text-sm w-full"
            autoFocus={showDetails && !customText}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 2: Hero's Journey Form ──────────────────────────────────────────────

// inputMode: 'guided' | 'custom'
const HeroForm = ({ inputMode, setInputMode, tags, setTags, customFields, setCustomFields, customPrompt, setCustomPrompt }) => (
  <div className="animate-slide-up">
    <h2 className="text-2xl font-semibold text-white mb-1">Paint Your Future</h2>
    <p className="text-gray-500 text-sm mb-5">
      Choose how you want to describe your vision.
    </p>

    {/* Mode tabs */}
    <div className="flex gap-1 p-1 bg-void border border-border rounded-xl mb-6 w-fit">
      <button
        onClick={() => setInputMode('guided')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
          ${inputMode === 'guided'
            ? 'bg-surface text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-300'}`}
      >
        🎯 Life Areas
      </button>
      <button
        onClick={() => setInputMode('custom')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
          ${inputMode === 'custom'
            ? 'bg-surface text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-300'}`}
      >
        ✍️ Custom Prompt
      </button>
    </div>

    {inputMode === 'guided' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LIFE_AREAS.map((area) => (
          <LifeAreaBox
            key={area.key}
            area={area}
            selectedTags={tags[area.key] ?? []}
            customText={customFields[area.key] ?? ''}
            onTagToggle={(tag) => {
              setTags((prev) => {
                const current = prev[area.key] ?? []
                return {
                  ...prev,
                  [area.key]: current.includes(tag)
                    ? current.filter((t) => t !== tag)
                    : [...current, tag],
                }
              })
            }}
            onCustomChange={(val) => setCustomFields((prev) => ({ ...prev, [area.key]: val }))}
          />
        ))}
      </div>
    ) : (
      <div className="animate-fade-in">
        <p className="text-xs text-gray-500 mb-3">
          Describe your ideal future in your own words. Be as vivid and specific as possible — the AI will generate 6 distinct visual scenes from your description.
        </p>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={10}
          placeholder={`Example: I'm a successful tech entrepreneur living between Istanbul and Bali. I wake up at sunrise, meditate on my villa terrace overlooking the ocean, then spend my mornings building products that impact millions. My evenings are filled with deep conversations with brilliant friends. I'm in peak physical shape, financially free, and deeply at peace with who I am...`}
          className="input-field resize-none text-sm w-full leading-relaxed"
          autoFocus
        />
        <p className="text-xs text-gray-600 mt-2">
          {customPrompt.length} characters — aim for 200+ for best results
        </p>
      </div>
    )}
  </div>
)

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

const ReviewStep = ({ file, tags, customFields, inputMode, customPrompt, submitting, submitStage }) => {
  const preview = file ? URL.createObjectURL(file) : null
  const filledAreas = LIFE_AREAS.filter(
    (a) => (tags[a.key]?.length > 0) || customFields[a.key]?.trim()
  )

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-semibold text-white mb-1">Ready to Manifest</h2>
      <p className="text-gray-500 text-sm mb-8">
        Review your vision before we begin the transformation.
      </p>
      <div className="space-y-4">
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

        <div className="bg-panel border border-border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Your Vision</p>
          {inputMode === 'custom' ? (
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
              {customPrompt || <span className="text-gray-600 italic">No prompt entered.</span>}
            </p>
          ) : filledAreas.length > 0 ? (
            <div className="space-y-2">
              {filledAreas.map((a) => (
                <div key={a.key}>
                  <p className="text-xs text-gray-600 mb-1">{a.emoji} {a.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {(tags[a.key] ?? []).map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-glow-dim/30 text-glow-soft border border-glow-dim">
                        {t}
                      </span>
                    ))}
                    {customFields[a.key]?.trim() && (
                      <span className="text-xs text-gray-400 italic line-clamp-1">
                        {customFields[a.key]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No areas filled in yet.</p>
          )}
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
  'Uploading inspiration images...',
  'Saving your vision...',
  'Analyzing your story with AI...',
  'Generating your images...',
  'Almost ready...',
]

// Build the story_inputs payload from tags + custom fields (guided mode)
function buildStoryPayload(tags, customFields) {
  const payload = {}
  LIFE_AREAS.forEach(({ key }) => {
    const selectedTags = tags[key] ?? []
    const custom = customFields[key]?.trim() ?? ''
    if (selectedTags.length > 0 || custom) {
      payload[key] = { tags: selectedTags, custom }
    }
  })
  return payload
}

export default function CreateVision() {
  const { user } = useAuth()
  const router   = useRouter()

  const [step, setStep]               = useState(0)
  const [file, setFile]               = useState(null)
  const [refImages, setRefImages]     = useState({}) // { home: {file, preview}, car: {...}, ... }
  const [inputMode, setInputMode]     = useState('guided') // 'guided' | 'custom'
  // guided mode state
  const [tags, setTags]               = useState({})
  const [customFields, setCustomFields] = useState({})
  // custom prompt mode state
  const [customPrompt, setCustomPrompt] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitStage, setSubmitStage] = useState(0)
  const [error, setError]             = useState(null)

  const hasAnyInput = () => {
    if (inputMode === 'custom') return customPrompt.trim().length > 0
    return LIFE_AREAS.some((a) => (tags[a.key]?.length > 0) || customFields[a.key]?.trim())
  }

  const canAdvance = () => {
    if (step === 0) return !!file
    if (step === 1) return hasAnyInput()
    return true
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setSubmitStage(0)
    setError(null)

    try {
      // 1. Upload selfie (max 1536px — PiAPI face swap limiti 2048x2048)
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

      // 2. Upload reference images
      const uploadedRefs = []
      for (const cat of REF_CATEGORIES) {
        const img = refImages[cat.key]
        if (!img?.file) continue
        const ext  = img.file.name.split('.').pop()
        const path = `refs/${user.id}/${Date.now()}-${cat.key}.${ext}`
        const { error: refErr } = await supabase.storage
          .from('vision-assets')
          .upload(path, img.file, { upsert: false })
        if (refErr) { console.warn(`Ref upload failed (${cat.key}):`, refErr.message); continue }
        const { data: refUrl } = supabase.storage.from('vision-assets').getPublicUrl(path)
        uploadedRefs.push({ label: cat.label, key: cat.key, url: refUrl.publicUrl })
      }

      // 3. Insert VisionProject
      setSubmitStage(1)
      const storyPayload = inputMode === 'custom'
        ? { custom_story: customPrompt.trim() }
        : buildStoryPayload(tags, customFields)

      const { data: project, error: insertError } = await supabase
        .from('vision_projects')
        .insert([{
          user_id: user.id,
          status: 'Draft',
          selfie_url: selfieUrl,
          story_inputs: storyPayload,
          reference_images: uploadedRefs,
        }])
        .select()
        .single()
      if (insertError) throw insertError

      // 3. Generate prompts
      setSubmitStage(2)
      await api.generatePrompts(project.id)

      // 4. Generate images — fire-and-forget (returns immediately, runs in background)
      // Review page polls DB every 6s and shows images as they arrive.
      setSubmitStage(3)
      await api.generateImages(project.id)

      // 5. Redirect to review — images will load there via polling
      setSubmitStage(4)
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
              <ReferenceImages refImages={refImages} setRefImages={setRefImages} />
            </>
          )}
          {step === 1 && (
            <HeroForm
              inputMode={inputMode} setInputMode={setInputMode}
              tags={tags} setTags={setTags}
              customFields={customFields} setCustomFields={setCustomFields}
              customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
            />
          )}
          {step === 2 && (
            <ReviewStep
              file={file} tags={tags} customFields={customFields}
              inputMode={inputMode} customPrompt={customPrompt}
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
                type="submit"
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
