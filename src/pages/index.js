/**
 * YourVision — Landing Page
 * Based on Claude Design HTML. Hero: 3 videos cycling fullscreen.
 * Videos: theapi.app URLs (swap with permanent CDN when ready)
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'

// 4 hero videos — served from /public/videos (permanent, no expiry)
const VIDEOS = [
  '/videos/hero-woman-1.mp4',
  '/videos/hero-man-1.mp4',
  '/videos/hero-woman-2.mp4',
  '/videos/hero-man-2.mp4',
]

// ─── Cycling hero video ───────────────────────────────────────────────────────
function HeroCycler() {
  const videoRef = useRef(null)
  const idxRef = useRef(0)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const next = () => {
      idxRef.current = (idxRef.current + 1) % VIDEOS.length
      el.src = VIDEOS[idxRef.current]
      el.play().catch(() => {})
    }
    el.addEventListener('ended', next)
    el.addEventListener('error', next)
    return () => { el.removeEventListener('ended', next); el.removeEventListener('error', next) }
  }, [])

  return (
    <video
      ref={videoRef}
      src={VIDEOS[0]}
      autoPlay
      muted
      playsInline
      preload="auto"
      style={{
        position: 'fixed',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        height: '100%',
        width: 'auto',
        zIndex: 0,
        opacity: 0.52,
      }}
    />
  )
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 900ms cubic-bezier(0.4,0,0.2,1), transform 900ms cubic-bezier(0.4,0,0.2,1)'
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = '1'; el.style.transform = 'none'; obs.unobserve(el) }
    }, { threshold: 0.06 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ─── Video card (hover to play) ───────────────────────────────────────────────
function VideoCard({ src, theme }) {
  const ref = useRef(null)
  const play = () => { if (ref.current) { if (!ref.current.src) ref.current.src = src; ref.current.play() } }
  const stop = () => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0 } }
  return (
    <div
      onMouseEnter={play} onMouseLeave={stop}
      onClick={() => ref.current?.paused ? play() : stop()}
      style={{
        position: 'relative', aspectRatio: '9/16',
        background: '#0F0E0C', borderRadius: '4px',
        overflow: 'hidden', cursor: 'pointer',
        border: '1px solid #1F1D1A',
      }}
    >
      <video ref={ref} muted playsInline loop preload="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(10,9,8,0.72) 0%, transparent 52%)',
        pointerEvents: 'none',
      }} />
      <span style={{
        position: 'absolute', bottom: '16px', left: '16px',
        fontSize: '0.62rem', fontWeight: 500, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: 'rgba(244,241,234,0.7)',
      }}>{theme}</span>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a, open, onToggle }) {
  return (
    <div onClick={onToggle} style={{ borderBottom: '1px solid #1F1D1A', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', padding: '22px 0' }}>
        <span style={{ color: '#F4F1EA', fontSize: '0.95rem', fontWeight: 300, lineHeight: 1.5 }}>{q}</span>
        <span style={{
          color: '#C9A961', fontSize: '1.25rem', fontWeight: 200,
          flexShrink: 0, transition: 'transform 320ms cubic-bezier(0.4,0,0.2,1)',
          transform: open ? 'rotate(45deg)' : 'none',
        }}>+</span>
      </div>
      <div style={{ maxHeight: open ? '320px' : '0', overflow: 'hidden', transition: 'max-height 400ms cubic-bezier(0.4,0,0.2,1)' }}>
        <p style={{ color: '#C5BFB8', fontSize: '0.88rem', lineHeight: 1.85, fontWeight: 300, paddingBottom: '22px' }}>{a}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState(null)

  const r1 = useReveal(), r2 = useReveal(), r3 = useReveal()
  const r4 = useReveal(), r5 = useReveal()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading || user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0908' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #1F1D1A', borderTopColor: '#C9A961', animation: 'spin 1.2s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const scenes = [
    { src: VIDEOS[0], theme: 'Peace' },
    { src: VIDEOS[1], theme: 'Success' },
    { src: VIDEOS[2], theme: 'Freedom' },
  ]

  const faqs = [
    { q: 'How long does it take?', a: 'Just a few minutes. Once you press generate, the process runs automatically — scenes are composed, your face placed in each, the film assembled. You receive an email when it is ready.' },
    { q: 'Can I create another one?', a: 'Yes. You can create a new one at any time — a different chapter, a different version of the life you are stepping into.' },
    { q: 'Is my photo stored?', a: 'Your photo is used only to create your film. It may be held briefly while your video is processed, then deleted. It is never shared, sold, or used for anything else.' },
    { q: 'What if I want something changed?', a: 'Before your film is assembled, you review every scene individually. Any scene that does not feel right can be redone. We want the final film to be something you will actually use.' },
    { q: 'Does this actually work?', a: 'Sustained visualization — specific, emotionally present, repeated — has a measurable effect on where attention goes and what the mind registers as possible. The video does not create your future. It trains your attention toward it.' },
  ]

  return (
    <>
      <Head>
        <title>YourVision — Name the life you&apos;re becoming.</title>
        <meta name="description" content="Write the vision in your own words. Receive a 30 or 60-second film of yourself, already inside it." />
        <meta property="og:title" content="YourVision — Name the life you're becoming." />
        <meta property="og:description" content="Write the vision in your own words. Receive a 30 or 60-second film of yourself, already inside it." />
        <meta property="og:image" content="https://yourvision.video/og-image.jpg" />
        <meta property="og:url" content="https://yourvision.video" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap" rel="stylesheet" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
          html{scroll-behavior:smooth;}
          body{background:#0A0908;}
          ::selection{background:rgba(201,169,97,0.15);color:#F4F1EA;}
          img,video{display:block;max-width:100%;}
        `}</style>
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
      {/* Fixed video background — outside the z-index:2 wrapper so cards paint over it */}
      <HeroCycler />
      {/* Global dark overlay over the fixed video */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'rgba(10,9,8,0.62)' }} />

      <div style={{ position: 'relative', zIndex: 2, background: 'transparent', color: '#F4F1EA', fontFamily: "'General Sans','Inter',-apple-system,sans-serif", fontWeight: 300 }}>

        {/* Nav */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', height: '64px',
          background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1F1D1A',
        }}>
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'none', border: '1px solid #1F1D1A', color: '#C5BFB8',
              fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '8px 20px', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'color 300ms, border-color 300ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F4F1EA'; e.currentTarget.style.borderColor = '#4A4640' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#C5BFB8'; e.currentTarget.style.borderColor = '#1F1D1A' }}
          >
            Begin — $12
          </button>
        </nav>

        {/* Hero */}
        <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* bottom fade into next section */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, transparent 50%, rgba(10,9,8,0.9) 100%)',
            zIndex: 1,
          }} />
          {/* Content constrained to video width (~56vh on desktop = 9:16 aspect) */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 'min(420px, 56vh)', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E2C97A', marginBottom: '44px', textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}>
              Your Vision Video
            </span>
            <h1 style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 'clamp(2.8rem,9vw,6.5rem)',
              fontWeight: 300, lineHeight: 1.08,
              letterSpacing: '0.04em', marginBottom: '28px',
              color: '#FFFFFF',
              textShadow: '0 2px 24px rgba(0,0,0,0.85)',
            }}>
              Name the life<br />
              <em style={{ fontStyle: 'italic', color: '#E2C97A' }}>you&apos;re becoming.</em>
            </h1>
            <p style={{ fontSize: 'clamp(1rem,2.2vw,1.15rem)', fontWeight: 300, color: '#E8E3DA', lineHeight: 1.75, maxWidth: '460px', margin: '0 auto 48px', textShadow: '0 1px 12px rgba(0,0,0,0.85)' }}>
              Write your story. Then live it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button onClick={() => router.push('/login')} style={{
                display: 'inline-block', padding: '14px 44px',
                border: '1px solid #C9A961', background: 'transparent',
                color: '#C9A961', fontSize: '0.85rem', fontWeight: 400,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
                transition: 'color 400ms, border-color 400ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#E0C285'; e.currentTarget.style.borderColor = '#E0C285' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#C9A961'; e.currentTarget.style.borderColor = '#C9A961' }}
              >
                Begin
              </button>
            </div>
          </div>
        </section>

        {/* Why it works */}
        <section style={{ borderTop: '1px solid #1F1D1A', borderBottom: '1px solid #1F1D1A', background: 'rgba(10,9,8,0.88)' }}>
          <div ref={r1} style={{ maxWidth: '560px', margin: '0 auto', padding: '100px 32px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E2C97A', marginBottom: '20px' }}>Why it works</span>
            <p style={{ fontSize: 'clamp(1rem,2vw,1.1rem)', fontWeight: 300, color: '#DDD8CF', lineHeight: 1.9 }}>
              The stories we tell ourselves become the lives we live. When you write your story — name the rooms, the light, the feeling — the mind begins to move toward it. Ancient practice. Made personal.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section style={{ background: 'rgba(15,14,12,0.90)', borderTop: '1px solid #1F1D1A', borderBottom: '1px solid #1F1D1A', padding: '100px 32px' }}>
          <div ref={r3} style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E2C97A', marginBottom: '20px', textAlign: 'center' }}>The process</span>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', textAlign: 'center', marginBottom: '80px', color: '#FFFFFF' }}>
              Five steps. Ten minutes.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '52px', maxWidth: '560px', margin: '0 auto' }}>
              {[
                { n: '01', title: 'Upload your selfie', desc: "A clear, front-facing photo. No filters, no studio — just you as you are today." },
                { n: '02', title: 'Write your story', desc: 'Write where you are. Write where you want to be. Your words become the scenes. The more specific, the more yours.' },
                { n: '03', title: 'Approve your scenes', desc: 'Review 6 AI-generated images — your face, your vision. Choose the ones that feel right.' },
                { n: '04', title: 'Receive your vision', desc: 'Unlock your film — 6 animated scenes, your face. Choose 30 or 60 seconds. The life you are stepping into — waiting in your inbox.' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: '32px' }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: '2rem', fontWeight: 200, color: '#2A2724', lineHeight: 1, flexShrink: 0, width: '44px' }}>{step.n}</span>
                  <div>
                    <p style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 400, marginBottom: '8px' }}>{step.title}</p>
                    <p style={{ color: '#DDD8CF', fontSize: '0.88rem', fontWeight: 300, lineHeight: 1.75 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ padding: '100px 32px', background: 'rgba(10,9,8,0.88)' }}>
          <div ref={r4} style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E2C97A', marginBottom: '20px' }}>Receive your vision</span>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', marginBottom: '52px', color: '#FFFFFF' }}>
              Choose your film.
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Starter */}
              <div style={{ border: '1px solid #2A2724', borderRadius: '4px', padding: '40px 36px', textAlign: 'left', background: '#0A0908' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C5BFB8', marginBottom: '20px' }}>Starter</span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(3rem,10vw,5rem)', fontWeight: 200, lineHeight: 1, letterSpacing: '-0.02em' }}>$12</span>
                </div>
                <span style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '28px' }}>Early Access</span>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {['6 cinematic scenes', '5 seconds each', '30-second film', 'Your face in every scene', 'Delivered to your inbox'].map(f => (
                    <li key={f} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#DDD8CF', fontWeight: 300 }}>
                      <span style={{ color: '#E2C97A', flexShrink: 0 }}>✦</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => router.push('/login')} style={{
                  width: '100%', padding: '13px 0', border: '1px solid #C9A961', background: 'transparent',
                  color: '#C9A961', fontSize: '0.82rem', fontWeight: 400, letterSpacing: '0.14em',
                  textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
                }}>
                  Begin — $12
                </button>
              </div>

              {/* Premium */}
              <div style={{ border: '1px solid #C9A961', borderRadius: '4px', padding: '40px 36px', textAlign: 'left', background: '#0D0C0A' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '20px' }}>Premium</span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(3rem,10vw,5rem)', fontWeight: 200, lineHeight: 1, letterSpacing: '-0.02em' }}>$20</span>
                </div>
                <span style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '28px' }}>Full Experience</span>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {['6 cinematic scenes', '10 seconds each', '60-second film', 'Your face in every scene', 'Delivered to your inbox'].map(f => (
                    <li key={f} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#DDD8CF', fontWeight: 300 }}>
                      <span style={{ color: '#E2C97A', flexShrink: 0 }}>✦</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => router.push('/login')} style={{
                  width: '100%', padding: '13px 0', border: '1px solid #C9A961', background: 'rgba(201,169,97,0.08)',
                  color: '#C9A961', fontSize: '0.82rem', fontWeight: 400, letterSpacing: '0.14em',
                  textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit',
                }}>
                  Begin — $20
                </button>
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#8A847E', letterSpacing: '0.06em' }}>Just the film. No subscription.</p>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ borderTop: '1px solid #1F1D1A', padding: '100px 32px', background: 'rgba(10,9,8,0.88)' }}>
          <div ref={r5} style={{ maxWidth: '640px', margin: '0 auto' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E2C97A', marginBottom: '20px', textAlign: 'center' }}>Questions</span>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.04em', textAlign: 'center', marginBottom: '52px', color: '#FFFFFF' }}>
              Everything you want to know.
            </h2>
            <div style={{ borderTop: '1px solid #1F1D1A' }}>
              {faqs.map((f, i) => (
                <FaqItem key={i} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1F1D1A', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'rgba(10,9,8,0.92)' }}>
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: '15px', fontWeight: 300, letterSpacing: '0.06em' }}>YourVision</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {[{ label: 'Terms', href: '/terms', isLink: true }, { label: 'Privacy', href: '/privacy', isLink: true }, { label: 'Contact', href: 'mailto:hello@yourvision.video', isLink: false }].map(item =>
              item.isLink
                ? <Link key={item.label} href={item.href} style={{ fontSize: '0.75rem', color: '#C5BFB8', letterSpacing: '0.08em', textDecoration: 'none' }}>{item.label}</Link>
                : <a key={item.label} href={item.href} style={{ fontSize: '0.75rem', color: '#C5BFB8', letterSpacing: '0.08em', textDecoration: 'none' }}>{item.label}</a>
            )}
            <span style={{ fontSize: '0.75rem', color: '#8A847E' }}>© {new Date().getFullYear()} YourVision</span>
          </div>
        </footer>

      </div>
    </>
  )
}
