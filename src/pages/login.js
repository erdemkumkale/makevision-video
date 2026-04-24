import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { user, loading, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth()
  const router = useRouter()

  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState(null)
  const [notice, setNotice]     = useState(null)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password)
      } else {
        const data = await signUpWithEmail(email, password)
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError(err.message ?? 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Head>
        <title>YourVision — Sign in</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap" rel="stylesheet" />
      </Head>

      {/* Grain */}
      <svg style={{ position: 'fixed', width: 0, height: 0 }} aria-hidden="true">
        <filter id="grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, filter: 'url(#grain-filter)', opacity: 0.032, mixBlendMode: 'overlay' }} />
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.28) 100%)' }} />

      <div style={{
        minHeight: '100vh', background: '#0A0908', color: '#F4F1EA',
        fontFamily: "'General Sans','Inter',-apple-system,sans-serif", fontWeight: 300,
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Nav */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: '64px',
          background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1F1D1A',
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em', color: '#F4F1EA' }}>YourVision</span>
          </Link>
        </nav>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '20px' }}>
              Vision film
            </span>
            <h1 style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 'clamp(2rem,6vw,3rem)',
              fontWeight: 300, lineHeight: 1.15,
              letterSpacing: '0.04em', marginBottom: '12px',
            }}>
              {mode === 'signin' ? (
                <>Welcome<br /><em style={{ fontStyle: 'italic', color: '#C9A961' }}>back.</em></>
              ) : (
                <>Name the life<br /><em style={{ fontStyle: 'italic', color: '#C9A961' }}>you&apos;re becoming.</em></>
              )}
            </h1>
          </div>

          {/* Card */}
          <div style={{
            width: '100%', maxWidth: '400px',
            border: '1px solid #1F1D1A', borderRadius: '4px',
            padding: '40px 36px',
            background: '#0F0E0C',
          }}>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '32px', border: '1px solid #1F1D1A', borderRadius: '4px', overflow: 'hidden' }}>
              {['signin', 'signup'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setNotice(null) }}
                  style={{
                    flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                    fontFamily: "'General Sans',sans-serif",
                    fontSize: '0.72rem', fontWeight: 400, letterSpacing: '0.14em',
                    textTransform: 'uppercase', transition: 'background 300ms, color 300ms',
                    background: mode === m ? '#C9A961' : 'transparent',
                    color: mode === m ? '#0A0908' : '#6B6560',
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  background: '#0A0908', border: '1px solid #1F1D1A', borderRadius: '4px',
                  color: '#F4F1EA', fontSize: '0.88rem', fontWeight: 300,
                  fontFamily: 'inherit', padding: '12px 16px', outline: 'none',
                  transition: 'border-color 300ms',
                }}
                onFocus={e => e.target.style.borderColor = '#C9A961'}
                onBlur={e => e.target.style.borderColor = '#1F1D1A'}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  background: '#0A0908', border: '1px solid #1F1D1A', borderRadius: '4px',
                  color: '#F4F1EA', fontSize: '0.88rem', fontWeight: 300,
                  fontFamily: 'inherit', padding: '12px 16px', outline: 'none',
                  transition: 'border-color 300ms',
                }}
                onFocus={e => e.target.style.borderColor = '#C9A961'}
                onBlur={e => e.target.style.borderColor = '#1F1D1A'}
              />

              {error && (
                <p style={{ fontSize: '0.8rem', color: '#E07070', background: 'rgba(224,112,112,0.08)', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '4px', padding: '10px 14px', lineHeight: 1.5 }}>
                  {error}
                </p>
              )}
              {notice && (
                <p style={{ fontSize: '0.8rem', color: '#C9A961', background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.2)', borderRadius: '4px', padding: '10px 14px', lineHeight: 1.5 }}>
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: '4px',
                  padding: '13px 24px',
                  border: '1px solid #C9A961', background: 'transparent',
                  color: '#C9A961', fontSize: '0.78rem', fontWeight: 400,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: busy ? 'not-allowed' : 'pointer', borderRadius: '4px',
                  fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
                  transition: 'color 300ms, border-color 300ms',
                }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' } }}
                onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
              >
                {busy ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #C9A961', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                    {mode === 'signin' ? 'Signing in…' : 'Creating…'}
                  </span>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: '#1F1D1A' }} />
              <span style={{ fontSize: '0.78rem', color: '#6B6560', letterSpacing: '0.1em' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#1F1D1A' }} />
            </div>

            {/* OAuth buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={signInWithGoogle}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  padding: '12px 20px', border: '1px solid #1F1D1A', borderRadius: '4px',
                  background: 'transparent', color: '#8A857C',
                  fontSize: '0.8rem', fontWeight: 400, letterSpacing: '0.06em',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 300ms, color 300ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A4640'; e.currentTarget.style.color = '#F4F1EA' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1D1A'; e.currentTarget.style.color = '#8A857C' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={signInWithApple}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  padding: '12px 20px', border: '1px solid #1F1D1A', borderRadius: '4px',
                  background: 'transparent', color: '#8A857C',
                  fontSize: '0.8rem', fontWeight: 400, letterSpacing: '0.06em',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 300ms, color 300ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A4640'; e.currentTarget.style.color = '#F4F1EA' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F1D1A'; e.currentTarget.style.color = '#8A857C' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#6B6560', lineHeight: 1.6, marginTop: '24px' }}>
              By continuing, you agree to our{' '}
              <Link href="/terms" style={{ color: '#8A857C', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: '#8A857C', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1F1D1A', padding: '20px 40px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#6B6560' }}>© {new Date().getFullYear()} YourVision</span>
        </footer>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )
}
