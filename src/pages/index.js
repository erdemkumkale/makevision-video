/* eslint-disable @next/next/no-img-element */
/**
 * makevision.video — Landing Page
 *
 * Assumptions:
 * 1. Fonts: Playfair Display (serif headlines) + Inter (body) via Google Fonts through next/head
 * 2. Video placeholders: /videos/hero.mp4, /videos/scene_1–6.mp4, /videos/process.mp4
 *    Swap these with real CDN URLs when assets are ready.
 * 3. OG image: /og-image.jpg — replace with real asset (1200×630)
 * 4. Logged-in users skip this page and go to /dashboard
 * 5. Theme chips on step 2 are decorative — actual selection happens in /create flow
 * 6. No testimonials section per brief — placeholder comment left for real ones later
 * 7. Warm palette uses inline styles throughout (not in the app's dark Tailwind config)
 * 8. "AI" not used in copy per brief — referred to as technology/process
 *
 * Hero headline options (A recommended):
 *   A) "See yourself already there."         ← used below
 *   B) "Your future self is waiting to be seen."
 *   C) "The life you want — yours to watch."
 *
 * Example grid section heading options (A recommended):
 *   A) "Six visions. Six lives already in motion."   ← used below
 *   B) "Every scene, a life that's already yours."
 */

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#FAF7F2',
  bgAlt:       '#F0EBE3',
  text:        '#1C1917',
  textMuted:   '#78716C',
  textSubtle:  '#A8A29E',
  accent:      '#C4714B',
  accentDark:  '#A85D3A',
  accentLight: '#F5EDE7',
  border:      '#E7E0D8',
}

// ─── Scroll fade-in hook ──────────────────────────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          obs.unobserve(el)
        }
      },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return ref
}

// ─── Video grid card ──────────────────────────────────────────────────────────
function VideoCard({ src, theme }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const play = () => { videoRef.current?.play(); setPlaying(true) }
  const pause = () => { videoRef.current?.pause(); setPlaying(false) }

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9/16', background: C.bgAlt }}
      onMouseEnter={play}
      onMouseLeave={pause}
      onClick={playing ? pause : play}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop
        preload="none"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark gradient at bottom for label legibility */}
      <div className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
      {/* Theme label */}
      <p className="absolute bottom-4 left-4 text-xs font-medium tracking-widest uppercase"
        style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '0.12em' }}>
        {theme}
      </p>
      {/* Play icon */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
            <svg className="w-4 h-4 ml-0.5" fill="white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div
      className="cursor-pointer"
      style={{ borderBottom: `1px solid ${C.border}` }}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-4 py-5">
        <span className="text-base font-medium" style={{ color: C.text }}>{question}</span>
        <span
          className="flex-shrink-0 mt-0.5 transition-transform duration-300"
          style={{
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            color: C.accent,
            width: '20px',
            height: '20px',
            display: 'block',
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
        </span>
      </div>
      <div
        style={{
          maxHeight: isOpen ? '400px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.35s ease',
        }}
      >
        <p className="pb-5 text-sm leading-relaxed" style={{ color: C.textMuted, fontWeight: 300 }}>
          {answer}
        </p>
      </div>
    </div>
  )
}

// ─── Shared section label ──────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <p className="text-center text-xs font-medium tracking-widest uppercase mb-4"
      style={{ color: C.accent, letterSpacing: '0.15em' }}>
      {children}
    </p>
  )
}

// ─── Shared section heading ────────────────────────────────────────────────────
function Heading({ children, className = '' }) {
  return (
    <h2
      className={`text-center ${className}`}
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
        fontWeight: 400,
        color: C.text,
        lineHeight: 1.25,
      }}
    >
      {children}
    </h2>
  )
}

// ─── CTA button ───────────────────────────────────────────────────────────────
function CtaButton({ onClick, children, fullWidth = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${fullWidth ? 'w-full' : ''} py-4 px-8 rounded-full text-base font-medium transition-all duration-300`}
      style={{
        background: hovered ? C.accentDark : C.accent,
        color: C.bg,
        boxShadow: hovered ? '0 6px 24px rgba(196,113,75,0.4)' : '0 4px 16px rgba(196,113,75,0.28)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  const whyRef    = useFadeIn(0)
  const gridRef   = useFadeIn(0)
  const howRef    = useFadeIn(0)
  const affirmRef = useFadeIn(0)
  const pricingRef = useFadeIn(0)
  const faqRef    = useFadeIn(0)

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: C.border, borderTopColor: C.accent }}
        />
      </div>
    )
  }

  const scenes = [
    { src: '/videos/scene_1.mp4', theme: 'Wealth' },
    { src: '/videos/scene_2.mp4', theme: 'Health' },
    { src: '/videos/scene_3.mp4', theme: 'Love' },
    { src: '/videos/scene_4.mp4', theme: 'Travel' },
    { src: '/videos/scene_5.mp4', theme: 'Creativity' },
    { src: '/videos/scene_6.mp4', theme: 'Peace' },
  ]

  const themes = ['Wealth', 'Health', 'Love', 'Travel', 'Creativity', 'Peace', 'Home', 'Success']

  const faqs = [
    {
      q: 'How long does it take?',
      a: 'About 10 minutes after you upload your photo. The process runs automatically — generating your scenes, placing your face, assembling the film. You\'ll get an email the moment it\'s ready.',
    },
    {
      q: 'Can I remake it?',
      a: 'Each vision video is $20. You can create as many as you want — new themes, new chapters, a different version of you. Many people make a new one at each season or major life milestone.',
    },
    {
      q: 'Is my photo stored?',
      a: 'Your photo is used only to create your video. It\'s held securely for up to 90 days so you can access and re-download your film, then deleted automatically. We don\'t share it, sell it, or use it for anything else. Full details in our Privacy Policy.',
    },
    {
      q: 'What if I don\'t like it?',
      a: 'Before your video is assembled, you review every scene individually and can request a redo on any that don\'t feel right. We want you to love it. If something fails on our end technically, we\'ll regenerate at no cost.',
    },
    {
      q: 'What do I do with it?',
      a: 'Set it as your phone\'s lock screen video. Watch it the moment you wake up, before your feet hit the floor. Play it before meditation or journaling. Some people loop it silently in the background while they work. It\'s yours — use it the way your practice calls for.',
    },
    {
      q: 'Does this actually work?',
      a: 'Visualization practice — sustained, consistent, emotionally alive — has a real track record. The video doesn\'t create your future. It trains your attention toward it, and a trained attention finds what a distracted one misses. Whether it works depends entirely on what you do with it.',
    },
  ]

  return (
    <>
      <Head>
        <title>MakeVision — See yourself already there.</title>
        <meta name="description" content="Upload your selfie, choose your vision themes, and receive a 60-second cinematic film of you living the life you're calling in. $20, one-time." />
        <meta property="og:title" content="MakeVision — See yourself already there." />
        <meta property="og:description" content="A 60-second vision video, starring you. Upload your photo, choose your themes, receive your film." />
        <meta property="og:image" content="https://makevision.video/og-image.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://makevision.video" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MakeVision — See yourself already there." />
        <meta name="twitter:description" content="A 60-second vision video, starring you." />
        <meta name="twitter:image" content="https://makevision.video/og-image.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav
          className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
          style={{
            background: 'rgba(250, 247, 242, 0.88)',
            backdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 500, color: C.text }}>
            MakeVision
          </span>
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-medium px-5 py-2 rounded-full transition-all duration-200"
            style={{ background: C.text, color: C.bg }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.background = C.text }}
          >
            Sign in
          </button>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative flex items-center justify-center overflow-hidden"
          style={{ minHeight: '100svh' }}>
          {/* Background video — the moment the product creates */}
          <video
            src="/videos/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.22 }}
          />
          {/* Warm vignette overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom,
                rgba(250,247,242,0.2) 0%,
                rgba(250,247,242,0.75) 60%,
                rgba(250,247,242,1) 100%)`,
            }}
          />

          <div className="relative w-full max-w-3xl mx-auto px-6 md:px-12 py-32 text-center">
            {/* Eyebrow */}
            <p
              className="text-xs font-medium tracking-widest uppercase mb-8"
              style={{ color: C.accent, letterSpacing: '0.16em' }}
            >
              Your vision. Your face. Your film.
            </p>

            {/* Headline */}
            <h1
              className="mb-7"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2.75rem, 8vw, 5.5rem)',
                fontWeight: 400,
                color: C.text,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              See yourself<br />
              <em style={{ color: C.accent, fontStyle: 'italic' }}>already there.</em>
            </h1>

            {/* Subheadline */}
            <p
              className="max-w-lg mx-auto mb-10"
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.75,
                color: C.textMuted,
                fontWeight: 300,
              }}
            >
              Upload your selfie, choose your vision themes, and receive a 60-second cinematic film of you — living the life you&apos;re calling in.
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <CtaButton onClick={() => router.push('/login')}>
                Create your vision — $20
              </CtaButton>
              <span style={{ fontSize: '0.72rem', color: C.textSubtle, letterSpacing: '0.04em' }}>
                One-time payment. Yours forever.
              </span>
            </div>
          </div>
        </section>

        {/* ── Why this works ────────────────────────────────────────────────── */}
        <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div
            ref={whyRef}
            className="max-w-xl mx-auto px-6 md:px-12 py-20 md:py-28 text-center"
          >
            <Label>Why it works</Label>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.9, color: C.textMuted, fontWeight: 300 }}>
              Your brain filters incoming information through a system that flags what you expect to see — and ignores the rest. Train it to recognize your future self, and it starts finding paths you previously couldn&apos;t notice. Visualization isn&apos;t wishful thinking. It&apos;s priming.
            </p>
          </div>
        </section>

        {/* ── Example videos grid ───────────────────────────────────────────── */}
        <section className="py-20 md:py-28 px-6 md:px-12">
          <div ref={gridRef} className="max-w-5xl mx-auto">
            <Label>Example visions</Label>
            <Heading className="mb-4">
              Six visions. Six lives already in motion.
            </Heading>
            <p
              className="text-center mb-14 max-w-md mx-auto"
              style={{ color: C.textMuted, fontWeight: 300, lineHeight: 1.7, fontSize: '0.9rem' }}
            >
              Hover to preview. Each video is 60 seconds — a different person, a different dream.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {scenes.map(s => (
                <VideoCard key={s.src} src={s.src} theme={s.theme} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section
          style={{
            background: C.bgAlt,
            borderTop: `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div ref={howRef} className="max-w-5xl mx-auto px-6 md:px-12 py-20 md:py-28">
            <Label>The process</Label>
            <Heading className="mb-16">Three steps. Ten minutes. One film.</Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
              {/* Steps */}
              <div className="space-y-12">
                {[
                  {
                    n: '01',
                    title: 'Upload your selfie',
                    desc: 'A clear, front-facing photo. No filters, no studio — just you as you are.',
                  },
                  {
                    n: '02',
                    title: 'Choose your themes',
                    desc: 'Pick the chapters of your future. As few or as many as feel true right now.',
                    chips: themes,
                  },
                  {
                    n: '03',
                    title: 'Receive your vision',
                    desc: '60 seconds. 6 scenes. Your face. The life you\'re becoming.',
                  },
                ].map(step => (
                  <div key={step.n} className="flex gap-6">
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '2.25rem',
                        fontWeight: 400,
                        color: C.border,
                        lineHeight: 1,
                        flexShrink: 0,
                        width: '2.75rem',
                      }}
                    >
                      {step.n}
                    </span>
                    <div>
                      <p className="font-medium mb-1.5" style={{ color: C.text, fontSize: '1.05rem' }}>
                        {step.title}
                      </p>
                      <p style={{ color: C.textMuted, fontWeight: 300, lineHeight: 1.75, fontSize: '0.9rem' }}>
                        {step.desc}
                      </p>
                      {step.chips && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {step.chips.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-3 py-1 rounded-full"
                              style={{
                                background: C.bg,
                                color: C.textMuted,
                                border: `1px solid ${C.border}`,
                                fontWeight: 400,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Process video — vertical, 9:16 */}
              <div
                className="rounded-2xl overflow-hidden w-full mx-auto"
                style={{
                  aspectRatio: '9/16',
                  maxHeight: '520px',
                  maxWidth: '292px',
                  background: C.border,
                }}
              >
                <video
                  src="/videos/process.mp4"
                  muted
                  playsInline
                  loop
                  autoPlay
                  preload="none"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Affirmations ──────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 px-6 md:px-12">
          <div ref={affirmRef} className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20 items-center">

              {/* Copy */}
              <div>
                <p
                  className="text-xs font-medium tracking-widest uppercase mb-4"
                  style={{ color: C.accent, letterSpacing: '0.15em' }}
                >
                  Feature
                </p>
                <h2
                  className="mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                    fontWeight: 400,
                    color: C.text,
                    lineHeight: 1.2,
                  }}
                >
                  Words that move<br />with you.
                </h2>
                <p className="text-sm mb-8" style={{ color: C.textMuted }}>
                  Optional affirmations appear with each scene. 6 scenes, 6 intentions.
                </p>

                <div style={{ color: C.textMuted, fontWeight: 300, lineHeight: 1.85, fontSize: '0.95rem' }} className="space-y-5">
                  <p>
                    Traditional vision boards pair every image with a word or mantra — &quot;abundance,&quot; &quot;I am enough,&quot; &quot;home.&quot; These aren&apos;t decoration. They&apos;re how intention gets encoded.
                  </p>
                  <p>
                    In your video, affirmations appear softly at the bottom of each scene — translucent, unhurried, more thought than text. Your eyes live the scene. Your mind absorbs the words. Both land at once.
                  </p>
                  <p style={{ fontStyle: 'italic', color: C.textSubtle }}>
                    Off by default. Turn them on if you want them.
                  </p>
                </div>
              </div>

              {/* Mockup — simulated scene frame */}
              <div
                className="relative rounded-2xl overflow-hidden flex items-end w-full mx-auto"
                style={{
                  aspectRatio: '9/16',
                  maxHeight: '480px',
                  maxWidth: '270px',
                  background: 'linear-gradient(160deg, #2D1B0E 0%, #4A2F1A 45%, #7A5535 100%)',
                }}
              >
                {/* Simulated warm light in scene */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at 35% 38%, rgba(255,190,80,0.3) 0%, transparent 55%),' +
                      'radial-gradient(ellipse at 65% 65%, rgba(196,113,75,0.2) 0%, transparent 45%)',
                  }}
                />
                {/* Scene label */}
                <div className="absolute top-5 left-0 right-0 flex justify-center">
                  <span
                    className="text-xs tracking-widest uppercase"
                    style={{ color: 'rgba(255,255,255,0.38)', letterSpacing: '0.14em' }}
                  >
                    Scene 04 · Wealth
                  </span>
                </div>
                {/* Affirmation text */}
                <div className="relative w-full px-7 pb-10" style={{ zIndex: 2 }}>
                  <p
                    className="text-center"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontStyle: 'italic',
                      fontSize: '1.05rem',
                      color: 'rgba(255,255,255,0.72)',
                      fontWeight: 400,
                      lineHeight: 1.6,
                      letterSpacing: '0.01em',
                    }}
                  >
                    I am already<br />becoming her.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div ref={pricingRef} className="max-w-md mx-auto px-6 md:px-12 py-20 md:py-28 text-center">
            <Label>Pricing</Label>

            <div
              className="rounded-3xl p-10 md:p-14 mb-6"
              style={{ background: C.bg, border: `1px solid ${C.border}` }}
            >
              {/* Price */}
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(3.5rem, 12vw, 5.5rem)',
                  fontWeight: 400,
                  color: C.text,
                  lineHeight: 1,
                  marginBottom: '8px',
                }}
              >
                $20
              </p>
              <p className="font-medium mb-5" style={{ color: C.text, fontSize: '1.05rem' }}>
                One 60-second vision video.
              </p>
              <p
                className="mb-8"
                style={{
                  color: C.textMuted,
                  fontWeight: 300,
                  lineHeight: 1.75,
                  fontSize: '0.88rem',
                }}
              >
                Yours to keep. Download in vertical format — perfect for your phone&apos;s lock screen or daily ritual.
              </p>
              <CtaButton onClick={() => router.push('/login')} fullWidth>
                Create your vision
              </CtaButton>
            </div>

            <p style={{ fontSize: '0.75rem', color: C.textSubtle }}>
              No subscription. No tiers. Just the video.
            </p>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 px-6 md:px-12">
          <div ref={faqRef} className="max-w-2xl mx-auto">
            <Label>Questions</Label>
            <Heading className="mb-12">Everything you want to know.</Heading>
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {faqs.map((faq, i) => (
                <FaqItem
                  key={i}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials placeholder ──────────────────────────────────────── */}
        {/* Add real testimonials here when available. Per brief: no fake names or stock photos. */}

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="max-w-2xl mx-auto px-6 md:px-12 py-24 md:py-32 text-center">
            <h2
              className="mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 400,
                color: C.text,
                lineHeight: 1.2,
              }}
            >
              Ready to see<br />
              <em style={{ color: C.accent, fontStyle: 'italic' }}>your future?</em>
            </h2>
            <p className="mb-10" style={{ color: C.textMuted, fontWeight: 300, lineHeight: 1.7 }}>
              Join the first wave of people making their future visible.
            </p>
            <CtaButton onClick={() => router.push('/login')}>
              Create your vision — $20
            </CtaButton>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer
          className="px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 500, color: C.text }}>
            MakeVision
          </span>
          <div
            className="flex flex-wrap justify-center items-center gap-5"
            style={{ fontSize: '0.78rem', color: C.textSubtle }}
          >
            <Link href="/terms" className="transition-colors" style={{ color: C.textSubtle }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textSubtle }}
            >
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors" style={{ color: C.textSubtle }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textSubtle }}
            >
              Privacy
            </Link>
            <a href="mailto:hello@makevision.video" style={{ color: C.textSubtle }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textSubtle }}
            >
              Contact
            </a>
            <span>© {new Date().getFullYear()} MakeVision</span>
          </div>
        </footer>

      </div>
    </>
  )
}
