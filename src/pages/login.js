import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { user, loading, signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth()
  const router = useRouter()

  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)
  const [notice, setNotice]   = useState(null)

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
        // onAuthStateChange will set user → useEffect above redirects
      } else {
        const data = await signUpWithEmail(email, password)
        // If email confirmation is required, session will be null
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.')
          setMode('signin')
        }
        // If auto-confirmed, onAuthStateChange handles redirect
      }
    } catch (err) {
      console.error('[Login] auth error:', err)
      setError(err.message ?? 'Authentication failed. Check the console for details.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 text-center animate-slide-up">
        <p className="text-glow-soft font-semibold text-xl tracking-wide mb-2">
          MakeVision<span className="text-gray-500">.video</span>
        </p>
        <h1 className="text-4xl font-semibold text-white leading-tight">
          Manifest your<br />
          <span className="text-glow-soft">future self.</span>
        </h1>
        <p className="text-gray-500 text-sm mt-4 max-w-xs mx-auto">
          Upload your photo, describe your dream life, and receive a cinematic AI video of the future you.
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm bg-panel border border-border rounded-2xl p-8 animate-slide-up">

        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-void border border-border rounded-xl mb-6">
          <button
            onClick={() => { setMode('signin'); setError(null); setNotice(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${mode === 'signin' ? 'bg-glow text-white shadow-glow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); setNotice(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${mode === 'signup' ? 'bg-glow text-white shadow-glow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-3 mb-5">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-glow w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-gray-600">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3
                       bg-white text-gray-900 font-medium text-sm rounded-xl
                       hover:bg-gray-100 transition-colors duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={signInWithApple}
            className="w-full flex items-center justify-center gap-3 px-5 py-3
                       bg-black text-white font-medium text-sm rounded-xl border border-gray-700
                       hover:bg-gray-900 transition-colors duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          By continuing, you agree to our{' '}
          <a href="/terms" className="hover:text-gray-400 underline underline-offset-2 transition-colors">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="hover:text-gray-400 underline underline-offset-2 transition-colors">Privacy Policy</a>.
        </p>
      </div>

      <p className="mt-8 text-xs text-gray-700 text-center animate-fade-in">
        Powered by Gemini · Magic Hour · Supabase
      </p>
    </div>
  )
}
