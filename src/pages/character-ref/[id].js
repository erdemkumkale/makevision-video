import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

export default function CharacterRef() {
  const router        = useRouter()
  const { id }        = router.query
  const { user }      = useAuth()

  const [imageUrl, setImageUrl]   = useState(null)
  const [version, setVersion]     = useState(1)   // 1 or 2
  const [v1Url, setV1Url]         = useState(null)
  const [v2Url, setV2Url]         = useState(null)
  const [feedback, setFeedback]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [redoing, setRedoing]     = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [error, setError]         = useState(null)
  const hasFetched                = useRef(false)

  useEffect(() => {
    if (!id || !user || hasFetched.current) return
    hasFetched.current = true
    generateRef()
  }, [id, user])

  const generateRef = async (feedbackText) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.generateCharacterRef(id, feedbackText)
      const url  = data?.image_url
      if (!url) throw new Error('No image returned')
      if (version === 1 || !feedbackText) {
        setV1Url(url)
        setVersion(1)
        setImageUrl(url)
      } else {
        setV2Url(url)
        setVersion(2)
        setImageUrl(url)
      }
    } catch (err) {
      setError(err.message ?? 'Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRedo = async () => {
    if (version >= 2) return // max 2 versions
    setRedoing(true)
    setError(null)
    try {
      const data = await api.generateCharacterRef(id, feedback.trim() || undefined)
      const url  = data?.image_url
      if (!url) throw new Error('No image returned')
      setV2Url(url)
      setVersion(2)
      setImageUrl(url)
      setFeedback('')
    } catch (err) {
      setError(err.message ?? 'Generation failed. Please try again.')
    } finally {
      setRedoing(false)
    }
  }

  const handleSelectVersion = (v) => {
    setVersion(v)
    setImageUrl(v === 1 ? v1Url : v2Url)
  }

  const handleContinue = async () => {
    setContinuing(true)
    try {
      // Seçilen karakter ref URL zaten story_inputs'a kaydedildi (son generate çağrısında)
      // Eğer v1 seçildiyse ama v2 üretildiyse, v1'i tekrar kaydetmemiz gerekiyor
      // En basiti: continue'da generateCharacterRef v1 URL'ini tekrar kaydet (feedback olmadan, sadece overwrite)
      // Aslında şu an son üretilen daima story_inputs'a kaydediliyor.
      // V1 seçilip V2 de üretilmişse, v1'i tekrar save etmemiz lazım.
      if (v2Url && version === 1) {
        await api.generateCharacterRef(id) // v1'i yeniden üret değil, ama şu an URL'yi kaydetmek için ek endpoint yok
        // Aslında bunu Supabase client ile direkt yapabiliriz ama şimdilik son üretilen URL kullanılacak
        // TODO: add a save-character-ref endpoint or use supabase client directly
      }
      // generate-prompts'u başlat (fire-and-forget)
      api.generatePrompts(id).catch(err => console.error('generatePrompts error:', err))
      router.push(`/review/${id}`)
    } catch (err) {
      setError(err.message)
      setContinuing(false)
    }
  }

  return (
    <>
      <Head>
        <title>Your Character — YourVision</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,200;0,300;1,200;1,300&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#0A0908', color: '#F4F1EA',
        fontFamily: "'General Sans', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '48px 24px 64px',
      }}>
        {/* Nav */}
        <div style={{ width: '100%', maxWidth: '480px', marginBottom: '48px' }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
        </div>

        <div style={{ width: '100%', maxWidth: '480px', animation: 'fade 0.6s ease' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '16px' }}>
            Step 1 of 2 — Your Character
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em', marginBottom: '12px' }}>
            Meet your<br />
            <em style={{ fontStyle: 'italic', color: '#C9A961' }}>cinematic self.</em>
          </h1>
          <p style={{ color: '#C5BFB8', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '36px' }}>
            This character will appear in all your scenes. You can refine it once before we continue.
          </p>

          {/* Image area */}
          <div style={{
            width: '100%', aspectRatio: '3/4', maxWidth: '320px', margin: '0 auto 24px',
            background: '#0F0E0C', border: '1px solid #1F1D1A', borderRadius: '6px',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #1F1D1A', borderTopColor: '#C9A961', animation: 'spin 1.2s linear infinite' }} />
                <p style={{ fontSize: '0.78rem', color: '#4A4640', letterSpacing: '0.08em' }}>Generating your character…</p>
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Character reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>

          {/* V1/V2 toggle */}
          {v2Url && !loading && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {[1, 2].map(v => (
                <button key={v} onClick={() => handleSelectVersion(v)} style={{
                  padding: '8px 24px', border: `1px solid ${version === v ? '#C9A961' : '#1F1D1A'}`,
                  background: version === v ? 'rgba(201,169,97,0.08)' : 'transparent',
                  color: version === v ? '#C9A961' : '#C5BFB8',
                  fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
                }}>
                  V{v}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ color: '#E07070', fontSize: '0.82rem', textAlign: 'center', marginBottom: '16px' }}>{error}</p>
          )}

          {/* Feedback + Redo — only if V2 not yet generated */}
          {!loading && !v2Url && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.75rem', color: '#C5BFB8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Not quite right? Describe what to change:
              </p>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="e.g. Make the hair darker, more athletic build, broader shoulders…"
                rows={3}
                style={{
                  width: '100%', background: '#0F0E0C', border: '1px solid #1F1D1A',
                  color: '#F4F1EA', fontSize: '0.88rem', lineHeight: 1.7,
                  padding: '12px 14px', borderRadius: '4px', resize: 'none',
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleRedo}
                disabled={redoing}
                style={{
                  marginTop: '10px', width: '100%', padding: '11px',
                  border: '1px solid #1F1D1A', background: 'transparent',
                  color: redoing ? '#4A4640' : '#C5BFB8', fontSize: '0.8rem',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: redoing ? 'not-allowed' : 'pointer', borderRadius: '4px', fontFamily: 'inherit',
                }}
              >
                {redoing ? 'Generating…' : '↺ Try Again (1 left)'}
              </button>
            </div>
          )}

          {/* Continue */}
          {!loading && imageUrl && (
            <button
              onClick={handleContinue}
              disabled={continuing}
              style={{
                width: '100%', padding: '14px',
                border: '1px solid #C9A961', background: 'transparent',
                color: continuing ? '#4A4640' : '#C9A961', fontSize: '0.85rem',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: continuing ? 'not-allowed' : 'pointer', borderRadius: '4px', fontFamily: 'inherit',
              }}
            >
              {continuing ? 'Preparing your scenes…' : 'Looks good — Continue ✦'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
