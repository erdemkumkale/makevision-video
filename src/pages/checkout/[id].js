import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const PRICE = 12
const LS_CHECKOUT_URL = 'https://yourvisionvideo.lemonsqueezy.com/checkout/buy/fe254877-7211-4f60-ab83-4f3f844afb17'

const FEATURES = [
  '6 AI-generated images of your future self',
  'Each image animated into a cinematic 10-second clip',
  'All 6 scenes edited into your vision film',
  'Delivered to your inbox — yours to keep forever',
]

export default function Checkout() {
  const router            = useRouter()
  const { id: projectId } = router.query
  const { user }          = useAuth()

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
    const url = new URL(LS_CHECKOUT_URL)
    url.searchParams.set('checkout[custom][project_id]', projectId)
    url.searchParams.set('checkout[custom][user_id]', user.id)
    window.location.href = url.toString()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #1F1D1A', borderTopColor: '#C9A961', animation: 'spin 1.2s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C5BFB8', fontSize: '0.9rem' }}>
        Project not found.
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Unlock Your Vision — YourVision</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,200;0,300;0,400;1,200;1,300&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0A0908', color: '#F4F1EA', fontFamily: "'General Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid #1F1D1A', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={() => router.push(`/review/${projectId}`)}
            style={{ background: 'none', border: 'none', color: '#C5BFB8', fontSize: '0.8rem', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
        </nav>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
          <div style={{ width: '100%', maxWidth: '440px' }}>

            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '20px' }}>
                Early Access
              </span>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em', marginBottom: '16px' }}>
                Unlock your<br />
                <em style={{ fontStyle: 'italic', color: '#C9A961' }}>vision film.</em>
              </h1>
              <p style={{ color: '#C5BFB8', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.75 }}>
                One payment. One film. The life you&apos;re stepping into, already on screen.
              </p>
            </div>

            {/* Card */}
            <div style={{ border: '1px solid #1F1D1A', borderRadius: '4px', marginBottom: '24px' }}>

              {/* Price row */}
              <div style={{ padding: '28px 32px', borderBottom: '1px solid #1F1D1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C5BFB8', marginBottom: '4px' }}>Your Vision Video</p>
                  <p style={{ fontSize: '0.82rem', color: '#C9A961', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.72rem' }}>Early Access</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: '2.8rem', fontWeight: 200, lineHeight: 1, letterSpacing: '-0.02em' }}>${PRICE}</p>
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 200, color: '#4A4640', textDecoration: 'line-through', marginTop: '2px' }}>$20</p>
                </div>
              </div>

              {/* Features */}
              <ul style={{ padding: '24px 32px', margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {FEATURES.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#C5BFB8', fontWeight: 300, lineHeight: 1.6 }}>
                    <span style={{ color: '#C9A961', flexShrink: 0, marginTop: '2px' }}>✦</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Project ref */}
              <div style={{ padding: '12px 32px 20px', borderTop: '1px solid #1F1D1A', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4A4640' }}>
                <span>Project</span>
                <span style={{ fontFamily: 'monospace' }}>#{projectId?.slice(-8).toUpperCase()}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handlePay}
              style={{
                width: '100%', padding: '14px 44px',
                border: '1px solid #C9A961', background: 'transparent',
                color: '#C9A961', fontSize: '0.85rem', fontWeight: 400,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
                transition: 'color 300ms, border-color 300ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
            >
              Continue to Checkout — ${PRICE}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#4A4640', marginTop: '16px', letterSpacing: '0.04em' }}>
              Secure checkout via Lemon Squeezy.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
