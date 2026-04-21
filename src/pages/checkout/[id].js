import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const PRICE = 19.99
const LS_CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '✦', text: '6 AI-generated cinematic images of your future self' },
  { icon: '✦', text: 'Professional video edit weaving your story together' },
  { icon: '✦', text: 'HD download — yours to keep forever' },
  { icon: '✦', text: "Powered by your unique vision, no one else's" },
]

// ─── Checkout ─────────────────────────────────────────────────────────────────

export default function Checkout() {
  const router            = useRouter()
  const { id: projectId } = router.query
  const { user, profile } = useAuth()

  const [project, setProject]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!user || !projectId) return
    const load = async () => {
      const { data, error } = await supabase
        .from('vision_projects')
        .select('id, status, created_at')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      // Guard: only allow access when status is Payment_Pending
      if (data.status !== 'Payment_Pending') {
        router.replace(
          data.status === 'Completed' || data.status === 'Processing'
          ? `/processing/${projectId}`
          : `/review/${projectId}`
        )
        return
      }

      setProject(data)
      setLoading(false)
    }
    load()
  }, [user, projectId, router])

  const handlePay = () => {
    if (!LS_CHECKOUT_URL) {
      console.error('REACT_APP_LEMONSQUEEZY_CHECKOUT_URL is not set')
      return
    }
    // Pass project_id and user email as Lemon Squeezy checkout data
    const url = new URL(LS_CHECKOUT_URL)
    url.searchParams.set('checkout[custom][vision_project_id]', projectId)
    url.searchParams.set('checkout[email]', profile?.email ?? '')
    window.location.href = url.toString()
  }

  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-gray-500 text-sm">
        Project not found.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push(`/review/${projectId}`)}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Review
          </button>
          <span className="text-glow-soft font-semibold tracking-wide text-sm">
            YourVision<span className="text-gray-500">.video</span>
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg animate-slide-up">

          {/* Hero copy */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full
                            bg-glow-dim/30 border border-glow-dim shadow-glow mb-6">
              <span className="text-2xl">✦</span>
            </div>
            <h1 className="text-3xl font-semibold text-white leading-tight">
              Your hero&apos;s journey is ready<br />
              <span className="text-glow-soft">to be visualized.</span>
            </h1>
            <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto">
              One payment. One video. A cinematic portrait of the life you&apos;re stepping into.
            </p>
          </div>

          {/* Card */}
          <div className="bg-panel border border-border rounded-2xl overflow-hidden mb-6">
            {/* Price header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vision Video</p>
                <p className="text-gray-200 font-medium text-sm">YourVision.video — Full Package</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-white">${PRICE}</p>
                <p className="text-xs text-gray-600">one-time</p>
              </div>
            </div>

            {/* Features */}
            <ul className="px-6 py-5 space-y-3">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-glow-soft mt-0.5 flex-shrink-0">{f.icon}</span>
                  {f.text}
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div className="mx-6 border-t border-border" />

            {/* Project ref */}
            <div className="px-6 py-4 flex items-center justify-between text-xs text-gray-600">
              <span>Project ref</span>
              <span className="font-mono text-gray-500">#{projectId.slice(-8).toUpperCase()}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handlePay}
            className="group w-full relative flex items-center justify-center gap-3
                       px-8 py-4 rounded-xl font-medium text-white text-base
                       bg-glow hover:bg-violet-500 shadow-glow hover:shadow-glow-lg
                       transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pay with Lemon Squeezy — ${PRICE}
            <span className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <p className="text-center text-xs text-gray-600 mt-4">
            Secure checkout via Lemon Squeezy. No subscription. Cancel anytime is not applicable — this is a one-time purchase.
          </p>
        </div>
      </div>
    </div>
  )
}
