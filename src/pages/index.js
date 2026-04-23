/* eslint-disable @next/next/no-img-element */
/**
 * yourvision.video — Landing Page v2 (Dark / Magician)
 *
 * Assumptions:
 * 1. Fonts: Fraunces (Google Fonts, variable) for headlines + General Sans (Fontshare) for body
 * 2. Video placeholders: /videos/hero.mp4, /videos/scene_1–6.mp4, /videos/process.mp4
 *    Swap these with real CDN URLs when assets are ready.
 * 3. OG image: /og-image.jpg — replace with real asset (1200×630)
 * 4. Logged-in users are redirected to /dashboard
 * 5. Theme chips in step 2 are decorative — selection happens in /create flow
 * 6. No testimonials — placeholder comment left for when real ones are available
 * 7. "AI" not used in user-facing copy. Referred to as "process" / "craft"
 * 8. Film grain via inline SVG filter, no external asset required
 *
 * Hero headline options:
 *   A) "Name the life you're becoming."   ← SELECTED
 *   B) "Speak the life. Watch it arrive."
 *   C) "See yourself already there."
 *
 * Example grid heading options:
 *   A) "Six visions. Six lives already in motion."   ← SELECTED
 *   B) "Every scene, a life already yours."
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#0A0908',
  bgAlt:      '#0F0E0C',
  text:       '#F4F1EA',
  muted:      '#8A857C',
  subtle:     '#4A4640',
  accent:     '#C9A961',
  accentHov:  '#E0C285',
  border:     '#1F1D1A',
}

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)'

// ─── Scroll fade-in hook ──────────────────────────────────────────────────────
function useFadeIn(delay = 0, duration = 1000) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = `opacity ${duration}ms ${ease} ${delay}ms, transform ${duration}ms ${ease} ${delay}ms`
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          obs.unobserve(el)
        }
      },
      { threshold: 0.06 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay, duration])
  return ref
}

// ─── Grain overlay ────────────────────────────────────────────────────────────
// SVG noise filter, no external asset. ~3% opacity so it reads as texture not noise.
function GrainOverlay() {
  return (
    <>
      <svg style={{ position: 'fixed', width: 0, height: 0 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          filter: 'url(#grain)',
          opacity: 0.032,
          mixBlendMode: 'overlay',
        }}
      />
      {/* Vignette — edges ~5% darker */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.28) 100%)',
        }}
      />
    </>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <p style={{
      fontSize: '0.68rem',
      fontWeight: 500,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: C.accent,
      marginBottom: '20px',
      textAlign: 'center',
    }}>
      {children}
    </p>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function H2({ children, style = {} }) {
  return (
    <h2 style={{
      fontFamily: "'Fraunces', serif",
      fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
      fontWeight: 300,
      color: C.text,
      lineHeight: 1.15,
      letterSpacing: '0.04em',
      textAlign: 'center',
      ...style,
    }}>
      {children}
    </h2>
  )
}

// ─── CTA button ───────────────────────────────────────────────────────────────
function CtaButton({ onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-block',
        padding: '14px 44px',
        border: `1px solid ${hov ? C.accentHov : C.accent}`,
        background: 'transparent',
        color: hov ? C.accentHov : C.accent,
        fontFamily: "'General Sans', 'Inter', sans-serif",
        fontSize: '0.85rem',
        fontWeight: 400,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: `color 400ms ${ease}, border-color 400ms ${ease}`,
      }}
    >
      {children}
    </button>
  )
}

// ─── Video card ───────────────────────────────────────────────────────────────
function VideoCard({ src, theme }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)

  const play = () => { ref.current?.play(); setPlaying(true) }
  const stop = () => { ref.current?.pause(); ref.current && (ref.current.currentTime = 0); setPlaying(false) }

  return (
    <div
      onMouseEnter={play}
      onMouseLeave={stop}
      onClick={playing ? stop : play}
      style={{
        position: 'relative',
        aspectRatio: '9/16',
        background: C.bgAlt,
        borderRadius: '4px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${C.border}`,
      }}
    >
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        loop
        preload="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(10,9,8,0.7) 0%, transparent 50%)',
      }} />
      <p style={{
        position: 'absolute', bottom: '16px', left: '16px',
        fontSize: '0.65rem',
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'rgba(244,241,234,0.7)',
        fontFamily: "'General Sans', 'Inter', sans-serif",
      }}>
        {theme}
      </p>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ question, answer, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        borderBottom: `1px solid ${C.border}`,
        cursor: 'pointer',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '22px 0',
      }}>
        <span style={{ color: C.text, fontSize: '0.95rem', fontWeight: 300, lineHeight: 1.5 }}>
          {question}
        </span>
        <span style={{
          color: C.accent,
          flexShrink: 0,
          marginTop: '2px',
          transition: `transform 300ms ${ease}`,
          transform: open ? 'rotate(45deg)' : 'none',
          fontSize: '1.2rem',
          lineHeight: 1,
          fontWeight: 200,
        }}>
          +
        </span>
      </div>
      <div style={{
        maxHeight: open ? '300px' : '0',
        overflow: 'hidden',
        transition: `max-height 400ms ${ease}`,
      }}>
        <p style={{
          color: C.muted,
          fontSize: '0.88rem',
          lineHeight: 1.8,
          fontWeight: 300,
          paddingBottom: '22px',
        }}>
          {answer}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  const r1 = useFadeIn(0, 1100)
  const r2 = useFadeIn(0, 1100)
  const r3 = useFadeIn(0, 1000)
  const r4 = useFadeIn(0, 1000)
  const r5 = useFadeIn(0, 1000)
  const r6 = useFadeIn(0, 1000)
  const r7 = useFadeIn(0, 1000)

  if (loading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{
          width: '24px', height: '24px',
          borderRadius: '50%',
          border: `1px solid ${C.border}`,
          borderTopColor: C.accent,
          animation: 'spin 1.2s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const scenes = [
    { src: 'https://storage.theapi.app/videos/308819191301892.mp4', theme: 'Peace' },
    { src: 'https://storage.theapi.app/videos/308819177504361.mp4', theme: 'Success' },
    { src: 'https://storage.theapi.app/videos/308819186312361.mp4', theme: 'Freedom' },
  ]

  const themes = ['Wealth', 'Health', 'Love', 'Travel', 'Creativity', 'Peace', 'Home', 'Success']

  const faqs = [
    {
      q: 'How long does it take?',
      a: 'About 10 minutes after you upload your photo. The process runs automatically — scenes are composed, your face placed in each, the film assembled. You receive an email when it is ready.',
    },
    {
      q: 'Can I create another one?',
      a: 'Each video is $20. You can return at any new chapter — different themes, a different version of the life you are growing into. Many people make one with each season.',
    },
    {
      q: 'Is my photo stored?',
      a: 'Your photo is used only to create your film. It is held securely for up to 90 days so you can access your video, then permanently deleted. It is never shared, sold, or used for anything else. Full details in the Privacy Policy.',
    },
    {
      q: 'What if I want something changed?',
      a: 'Before your film is assembled, you review every scene individually. Any scene that does not feel right can be redone. We want the final film to be something you will actually use.',
    },
    {
      q: 'What do I do with it?',
      a: 'Set it as your phone\'s lock screen. Watch it before your feet touch the floor. Play it before journaling or meditation. It is yours — use it the way your practice calls for.',
    },
    {
      q: 'Does this actually work?',
      a: 'Sustained visualization — specific, emotionally present, repeated — has a measurable effect on where attention goes and what the mind registers as possible. The video does not create your future. It trains your attention toward it.',
    },
  ]

  return (
    <>
      <Head>
        <title>YourVision — Name the life you&apos;re becoming.</title>
        <meta name="description" content="Write the vision in your own words. Receive a 60-second film of yourself, already inside it. One-time, $20." />
        <meta property="og:title" content="YourVision — Name the life you're becoming." />
        <meta property="og:description" content="Write the vision in your own words. Receive a 60-second film of yourself, already inside it." />
        <meta property="og:image" content="https://yourvision.video/og-image.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourvision.video" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="YourVision — Name the life you're becoming." />
        <meta name="twitter:description" content="Write the vision in your own words. Receive a 60-second film of yourself, already inside it." />
        <meta name="twitter:image" content="https://yourvision.video/og-image.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: ${C.bg}; }
          ::selection { background: ${C.accent}22; color: ${C.text}; }
        `}</style>
      </Head>

      <GrainOverlay />

      <div style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'General Sans', 'Inter', -apple-system, sans-serif",
        fontWeight: 300,
      }}>

        {/* ── Nav ── */}
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          height: '64px',
          background: 'rgba(10,9,8,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{
            fontFamily: "'Fraunces', serif",
            fontSize: '17px',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: C.text,
          }}>
            YourVision
          </span>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'none',
              border: `1px solid ${C.border}`,
              color: C.muted,
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '8px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: `color 300ms ${ease}, border-color 300ms ${ease}`,
              fontFamily: "'General Sans', 'Inter', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.subtle }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
          >
            Sign in
          </button>
        </nav>

        {/* ── Hero ── */}
        <section style={{
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <video
            src="/videos/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.18,
            }}
          />
          {/* Dark fade from bottom so text reads */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom, ${C.bg}55 0%, ${C.bg}CC 65%, ${C.bg} 100%)`,
          }} />

          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '760px',
            margin: '0 auto',
            padding: '0 32px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '0.65rem',
              fontWeight: 500,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: C.accent,
              marginBottom: '48px',
            }}>
              Vision film
            </p>

            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(2.8rem, 8vw, 6rem)',
              fontWeight: 300,
              color: C.text,
              lineHeight: 1.1,
              letterSpacing: '0.05em',
              marginBottom: '32px',
            }}>
              Name the life<br />
              <em style={{ fontStyle: 'italic', color: C.accent }}>you&apos;re becoming.</em>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              fontWeight: 300,
              color: C.muted,
              lineHeight: 1.75,
              maxWidth: '480px',
              margin: '0 auto 52px',
            }}>
              Write the vision in your own words. Receive a 60-second film of yourself, already inside it.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <CtaButton onClick={() => router.push('/login')}>Begin</CtaButton>
              <span style={{ fontSize: '0.7rem', color: C.subtle, letterSpacing: '0.06em' }}>
                One-time payment. Yours forever.
              </span>
            </div>
          </div>
        </section>

        {/* ── Why it works ── */}
        <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div
            ref={r1}
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              padding: '100px 32px',
              textAlign: 'center',
            }}
          >
            <Label>Why it works</Label>
            <p style={{
              fontSize: '1.05rem',
              fontWeight: 300,
              color: C.muted,
              lineHeight: 1.9,
            }}>
              The mind recognizes what it has already seen. Visualization primes perception — you begin noticing openings, meeting the right rooms, moving toward what was once only imagined. This is old practice, made personal.
            </p>
          </div>
        </section>

        {/* ── Example grid ── */}
        <section style={{ padding: '100px 32px' }}>
          <div ref={r2} style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Label>Example visions</Label>
            <H2 style={{ marginBottom: '16px' }}>
              Six visions. Six lives already in motion.
            </H2>
            <p style={{
              textAlign: 'center',
              color: C.muted,
              fontSize: '0.88rem',
              fontWeight: 300,
              lineHeight: 1.7,
              marginBottom: '56px',
            }}>
              Hover to watch. Each film is 60 seconds — a different person, a different intention.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
              className="md-grid-3"
            >
              {scenes.map(s => <VideoCard key={s.src} src={s.src} theme={s.theme} />)}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{
          background: C.bgAlt,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding: '100px 32px',
        }}>
          <div ref={r3} style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Label>The process</Label>
            <H2 style={{ marginBottom: '80px' }}>Three steps. Ten minutes.</H2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '48px',
              alignItems: 'center',
            }}
              className="how-grid"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '52px' }}>
                {[
                  {
                    n: '01',
                    title: 'Upload your selfie',
                    desc: 'A clear, front-facing photo. No filters, no studio — just you as you are today.',
                  },
                  {
                    n: '02',
                    title: 'Choose your themes',
                    desc: 'Pick the chapters of the life you are writing. As few or as many as feel true right now.',
                    chips: themes,
                  },
                  {
                    n: '03',
                    title: 'Receive your vision',
                    desc: '60 seconds. 6 scenes. Your face. The life you are moving toward.',
                  },
                ].map(step => (
                  <div key={step.n} style={{ display: 'flex', gap: '32px' }}>
                    <span style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: '2rem',
                      fontWeight: 200,
                      color: C.border,
                      lineHeight: 1,
                      flexShrink: 0,
                      width: '44px',
                    }}>
                      {step.n}
                    </span>
                    <div>
                      <p style={{ color: C.text, fontSize: '1rem', fontWeight: 400, marginBottom: '8px' }}>
                        {step.title}
                      </p>
                      <p style={{ color: C.muted, fontSize: '0.88rem', fontWeight: 300, lineHeight: 1.75 }}>
                        {step.desc}
                      </p>
                      {step.chips && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                          {step.chips.map(tag => (
                            <span key={tag} style={{
                              fontSize: '0.7rem',
                              fontWeight: 400,
                              letterSpacing: '0.08em',
                              padding: '5px 12px',
                              borderRadius: '4px',
                              border: `1px solid ${C.border}`,
                              color: C.muted,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Process video */}
              <div style={{
                aspectRatio: '9/16',
                maxHeight: '500px',
                maxWidth: '281px',
                margin: '0 auto',
                borderRadius: '4px',
                overflow: 'hidden',
                background: C.border,
                border: `1px solid ${C.border}`,
              }}>
                <video
                  src="/videos/process.mp4"
                  muted playsInline loop autoPlay preload="none"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Affirmations ── */}
        <section style={{ padding: '100px 32px' }}>
          <div ref={r4} style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '64px',
              alignItems: 'center',
            }}
              className="affirm-grid"
            >
              <div>
                <p style={{
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: C.accent,
                  marginBottom: '20px',
                }}>
                  Feature
                </p>
                <h2 style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                  fontWeight: 300,
                  color: C.text,
                  lineHeight: 1.15,
                  letterSpacing: '0.04em',
                  marginBottom: '12px',
                }}>
                  Words that move<br />with you.
                </h2>
                <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '32px' }}>
                  Optional affirmations appear with each scene. 6 scenes, 6 intentions.
                </p>
                <div style={{ color: C.muted, fontWeight: 300, lineHeight: 1.9, fontSize: '0.93rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <p>
                    Traditional vision boards pair every image with a word or mantra — &quot;abundance,&quot; &quot;I am enough,&quot; &quot;home.&quot; These are not decoration. They are how intention gets encoded.
                  </p>
                  <p>
                    In your video, affirmations appear softly at the bottom of each scene — translucent, unhurried, more thought than text. Your eyes live the scene. Your mind absorbs the words. Both land at once.
                  </p>
                  <p style={{ color: C.subtle, fontStyle: 'italic' }}>
                    Off by default. Turn them on if you want them.
                  </p>
                </div>
              </div>

              {/* Scene mockup */}
              <div style={{
                position: 'relative',
                aspectRatio: '9/16',
                maxHeight: '460px',
                maxWidth: '259px',
                margin: '0 auto',
                borderRadius: '4px',
                overflow: 'hidden',
                background: '#1A1108',
                border: `1px solid ${C.border}`,
              }}>
                {/* Warm scene simulation */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(ellipse at 40% 35%, rgba(201,169,97,0.15) 0%, transparent 60%),
                               radial-gradient(ellipse at 70% 70%, rgba(100,60,20,0.3) 0%, transparent 50%)`,
                }} />
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, textAlign: 'center' }}>
                  <span style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(244,241,234,0.3)',
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                  }}>
                    Scene 04 · Wealth
                  </span>
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  padding: '48px 28px 32px',
                  background: 'linear-gradient(to top, rgba(10,9,8,0.75) 0%, transparent 100%)',
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: '1.05rem',
                    color: 'rgba(244,241,234,0.72)',
                    lineHeight: 1.6,
                    letterSpacing: '0.02em',
                  }}>
                    I am already<br />becoming her.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section style={{
          background: C.bgAlt,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding: '100px 32px',
        }}>
          <div
            ref={r5}
            style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}
          >
            <Label>Pricing</Label>
            <div style={{
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
              padding: '56px 48px',
              marginBottom: '16px',
            }}>
              <p style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '0.75rem',
                fontWeight: 400,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.muted,
                marginBottom: '16px',
              }}>
                One ritual.
              </p>
              <p style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 'clamp(4rem, 12vw, 6rem)',
                fontWeight: 200,
                color: C.text,
                lineHeight: 1,
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}>
                $20
              </p>
              <p style={{
                color: C.muted,
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                marginBottom: '36px',
                textTransform: 'uppercase',
              }}>
                Yours forever.
              </p>
              <p style={{
                color: C.muted,
                fontSize: '0.88rem',
                fontWeight: 300,
                lineHeight: 1.8,
                marginBottom: '40px',
              }}>
                A single 60-second vision, written by you, rendered with your face. Download in vertical format. Keep it on your lock screen, in your morning. Return to it whenever you need to remember.
              </p>
              <CtaButton onClick={() => router.push('/login')}>Begin</CtaButton>
            </div>
            <p style={{ fontSize: '0.72rem', color: C.subtle, letterSpacing: '0.06em' }}>
              No subscription. No tiers. Just the film.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: '100px 32px' }}>
          <div ref={r6} style={{ maxWidth: '640px', margin: '0 auto' }}>
            <Label>Questions</Label>
            <H2 style={{ marginBottom: '52px' }}>Everything you want to know.</H2>
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {faqs.map((f, i) => (
                <FaqItem
                  key={i}
                  question={f.q}
                  answer={f.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials placeholder — add real ones here when available */}

        {/* ── Final CTA ── */}
        <section style={{ borderTop: `1px solid ${C.border}`, padding: '120px 32px' }}>
          <div ref={r7} style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 300,
              color: C.text,
              lineHeight: 1.15,
              letterSpacing: '0.04em',
              marginBottom: '20px',
            }}>
              The life is already<br />
              <em style={{ fontStyle: 'italic', color: C.accent }}>waiting to be seen.</em>
            </h2>
            <p style={{
              color: C.muted,
              fontWeight: 300,
              lineHeight: 1.75,
              fontSize: '0.95rem',
              marginBottom: '48px',
            }}>
              Ten minutes to set the intention. A lifetime to remember it.
            </p>
            <CtaButton onClick={() => router.push('/login')}>Begin</CtaButton>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: `1px solid ${C.border}`,
          padding: '28px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
          className="footer-row"
        >
          <span style={{
            fontFamily: "'Fraunces', serif",
            fontSize: '15px',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: C.text,
          }}>
            YourVision
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
            {[
              { label: 'Terms', href: '/terms', isLink: true },
              { label: 'Privacy', href: '/privacy', isLink: true },
              { label: 'Contact', href: 'mailto:hello@yourvision.video', isLink: false },
            ].map(item => item.isLink ? (
              <Link
                key={item.label}
                href={item.href}
                style={{ fontSize: '0.75rem', color: C.subtle, letterSpacing: '0.08em', textDecoration: 'none', transition: `color 250ms ${ease}` }}
                onMouseEnter={e => { e.currentTarget.style.color = C.muted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.subtle }}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                style={{ fontSize: '0.75rem', color: C.subtle, letterSpacing: '0.08em', textDecoration: 'none', transition: `color 250ms ${ease}` }}
                onMouseEnter={e => { e.currentTarget.style.color = C.muted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.subtle }}
              >
                {item.label}
              </a>
            ))}
            <span style={{ fontSize: '0.75rem', color: C.subtle }}>
              © {new Date().getFullYear()} YourVision
            </span>
          </div>
        </footer>

        {/* Responsive helpers */}
        <style>{`
          @media (min-width: 768px) {
            .md-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }
            .how-grid { grid-template-columns: 1fr 1fr !important; }
            .affirm-grid { grid-template-columns: 1fr 1fr !important; }
            .footer-row { flex-direction: row !important; justify-content: space-between !important; }
          }
        `}</style>
      </div>
    </>
  )
}
