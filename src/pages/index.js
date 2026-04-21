/* eslint-disable @next/next/no-img-element */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // If logged in, go straight to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-void text-white flex flex-col">

      {/* Nav */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-glow-soft font-semibold tracking-wide text-sm">
            MakeVision<span className="text-gray-500">.video</span>
          </span>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign In →
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-glow-dim/30 border border-glow-dim
                          text-glow-soft text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-glow-soft animate-pulse" />
            AI-powered · Cinematic · Personal
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
            Manifest your
            <span className="block text-glow-soft">future self.</span>
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed max-w-xl mx-auto mb-10">
            Upload your selfie, describe your dream life — and receive a cinematic
            one-minute video of you living it. Powered by AI, made for believers.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-glow hover:bg-violet-500
                       text-white font-semibold rounded-xl shadow-glow hover:shadow-glow-lg
                       transition-all duration-300 text-base"
          >
            Create Your Vision
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          <p className="text-xs text-gray-600 mt-4">No subscription · One video · Yours to keep</p>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-surface/30">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-12">How it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  n: '01',
                  title: 'Upload your selfie',
                  desc: "A clear, front-facing photo. That's all we need.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                },
                {
                  n: '02',
                  title: 'Describe your dream life',
                  desc: 'Tell us where you want to be — career, lifestyle, success.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ),
                },
                {
                  n: '03',
                  title: 'Review AI-generated scenes',
                  desc: '6 cinematic scenes — your face, your story. Approve or redo.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  n: '04',
                  title: 'Receive your vision video',
                  desc: 'Pay once. Get a 1-minute cinematic film with ambient soundtrack.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  ),
                },
              ].map(step => (
                <div key={step.n} className="bg-panel border border-border rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="text-glow-soft">{step.icon}</div>
                    <span className="text-2xl font-bold text-border">{step.n}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{step.title}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA bottom */}
        <section className="border-t border-border">
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to see your future?</h2>
            <p className="text-gray-500 mb-8">Join the first wave of people manifesting with AI.</p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-glow hover:bg-violet-500
                         text-white font-semibold rounded-xl shadow-glow hover:shadow-glow-lg
                         transition-all duration-300"
            >
              Get Started →
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-gray-700">
        <div className="flex justify-center gap-6 mb-3">
          <a href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</a>
          <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
          <a href="mailto:hello@makevision.video" className="hover:text-gray-400 transition-colors">Contact</a>
        </div>
        <p>© {new Date().getFullYear()} MakeVision. All rights reserved.</p>
      </footer>
    </div>
  )
}
