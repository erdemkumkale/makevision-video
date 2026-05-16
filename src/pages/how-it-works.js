import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

const GOLD = '#C9A961'
const GOLD_LIGHT = '#E2C97A'
const TEXT = '#F4F1EA'
const TEXT_MUTED = '#C5BFB8'
const TEXT_DIM = '#DDD8CF'
const BG = '#0A0908'
const BG_CARD = '#111009'
const BG_CARD2 = '#181512'
const BORDER = 'rgba(201,169,97,0.15)'

function Nav() {
  const router = useRouter()
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 20px', height: '56px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <button onClick={() => router.push('/')} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 300,
        letterSpacing: '0.06em', color: TEXT,
      }}>YourVision</button>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link href="/vision-board-guide" style={{ fontSize: '0.78rem', color: TEXT_MUTED, textDecoration: 'none', letterSpacing: '0.06em' }}>Guide</Link>
        <button onClick={() => router.push('/login')} style={{
          background: 'none', border: `1px solid ${GOLD}`, color: GOLD,
          padding: '7px 18px', borderRadius: '4px', cursor: 'pointer',
          fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: 'inherit',
        }}>Create My Video →</button>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 20px',
      textAlign: 'center', color: TEXT_MUTED, fontSize: '0.78rem',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <Link href="/terms" style={{ color: TEXT_MUTED, textDecoration: 'none', marginRight: '24px' }}>Terms</Link>
        <Link href="/privacy" style={{ color: TEXT_MUTED, textDecoration: 'none', marginRight: '24px' }}>Privacy</Link>
        <a href="mailto:hello@yourvision.video" style={{ color: TEXT_MUTED, textDecoration: 'none' }}>Contact</a>
      </div>
      <div style={{ color: '#4A4640' }}>© {new Date().getFullYear()} YourVision. All rights reserved.</div>
    </footer>
  )
}

function CTAButton({ children, style = {} }) {
  const router = useRouter()
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => router.push('/login')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? GOLD_LIGHT : GOLD,
        color: '#0A0908', border: 'none', cursor: 'pointer',
        padding: '16px 36px', borderRadius: '4px',
        fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.06em',
        fontFamily: 'inherit', transition: 'background 250ms',
        ...style,
      }}
    >{children}</button>
  )
}

function Label({ children }) {
  return (
    <span style={{
      display: 'block', fontSize: '0.68rem', fontWeight: 500,
      letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD_LIGHT,
      marginBottom: '16px',
    }}>{children}</span>
  )
}

export default function HowItWorks() {
  return (
    <>
      <Head>
        <title>How It Works | YourVision</title>
        <meta name="description" content="Upload your photo, describe your dream life, and receive a cinematic AI vision board video with your face in every scene." />
        <meta property="og:title" content="How It Works | YourVision" />
        <meta property="og:description" content="Upload your photo, describe your dream life, and receive a cinematic AI vision board video with your face in every scene." />
        <meta property="og:image" content="https://yourvision.video/og-image.jpg" />
        <meta property="og:url" content="https://yourvision.video/how-it-works" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..700;1,9..144,200..700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@300,400,500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: ${BG}; }
          ::selection { background: rgba(201,169,97,0.15); color: ${TEXT}; }
        `}</style>
      </Head>

      <Nav />

      <main style={{
        background: BG, color: TEXT,
        fontFamily: "'General Sans', 'Inter', -apple-system, sans-serif",
        fontWeight: 300, overflowX: 'hidden', paddingTop: '56px',
      }}>

        {/* ── HERO ── */}
        <section style={{ padding: 'clamp(80px,12vw,140px) 20px clamp(64px,10vw,110px)', textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
          <Label>YourVision — Personalized AI Video</Label>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(2.4rem,7vw,4.8rem)',
            fontWeight: 300, lineHeight: 1.08, letterSpacing: '0.02em',
            marginBottom: '28px', color: '#FFFFFF',
          }}>
            See Yourself Living<br />
            <em style={{ fontStyle: 'italic', color: GOLD_LIGHT }}>Your Dream Life</em>
            <br />— In Cinematic AI Video
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2.2vw,1.15rem)', fontWeight: 300, color: '#E8E3DA', lineHeight: 1.75, maxWidth: '520px', margin: '0 auto 44px' }}>
            Upload your photo. Describe your future. Get a personalized vision board video with your face in every scene.
          </p>
          <CTAButton>Create My Vision Video →</CTAButton>
        </section>

        {/* ── THE PROBLEM ── */}
        <section style={{ padding: 'clamp(64px,10vw,100px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <Label>The Problem</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.6rem,4vw,2.6rem)',
              fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em',
              marginBottom: '48px', color: '#FFFFFF',
            }}>
              Traditional Vision Boards Don&apos;t Work<br />the Way They Should
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '48px' }}>
              {[
                { icon: '○', text: 'Generic stock images that don\'t feel like your life' },
                { icon: '○', text: 'Hours spent assembling boards you rarely revisit' },
                { icon: '○', text: 'No emotional connection — your face isn\'t in the picture' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <span style={{ color: GOLD, fontSize: '1.2rem', marginTop: '2px', flexShrink: 0 }}>{item.icon}</span>
                  <p style={{ color: TEXT_DIM, fontSize: '1.05rem', lineHeight: 1.7 }}>{item.text}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '1.1rem', color: TEXT, fontFamily: "'Fraunces', serif", fontWeight: 300, letterSpacing: '0.02em', fontStyle: 'italic' }}>
              YourVision changes all of that.
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS — 3 STEPS ── */}
        <section style={{ padding: 'clamp(64px,10vw,100px) 20px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <Label>The Process</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.6rem,4vw,2.6rem)',
              fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em',
              marginBottom: '64px', color: '#FFFFFF',
            }}>
              Three steps. Zero technical skill required.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {[
                {
                  n: '01',
                  title: 'Upload Your Photo',
                  desc: 'A clear selfie is all you need. Our AI learns your face and composites it naturally into every scene.',
                },
                {
                  n: '02',
                  title: 'Describe Your Dream Life',
                  desc: 'Tell us about the life you\'re stepping into. Career, relationships, travel, abundance — whatever your vision holds. Write it in plain words; no prompts needed.',
                },
                {
                  n: '03',
                  title: 'Receive Your Cinematic Video',
                  desc: 'We generate 6 personalized scenes featuring your face, delivered as a ready-to-watch video. No editing. No tools. Nothing to figure out.',
                },
              ].map((step) => (
                <div key={step.n} style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
                  <span style={{
                    fontFamily: "'Fraunces', serif", fontSize: '2.2rem', fontWeight: 200,
                    color: GOLD, lineHeight: 1, flexShrink: 0, minWidth: '52px',
                  }}>{step.n}</span>
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '20px', flex: 1 }}>
                    <p style={{ color: TEXT, fontSize: '1.05rem', fontWeight: 400, marginBottom: '10px' }}>{step.title}</p>
                    <p style={{ color: TEXT_DIM, fontSize: '0.92rem', lineHeight: 1.8 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT YOU GET / PRICING ── */}
        <section style={{ padding: 'clamp(64px,10vw,100px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <Label>What You Get</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.6rem,4vw,2.6rem)',
              fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em',
              marginBottom: '16px', color: '#FFFFFF',
            }}>
              Choose your depth of immersion
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '56px' }}>
              Both packages include 6 cinematic AI-generated scenes with your face composited into every frame, set to an emotional music soundtrack.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {[
                {
                  label: 'Essential',
                  price: '$12',
                  sceneLength: '5 seconds each',
                  total: '30 seconds',
                  best: 'Daily viewing ritual',
                  highlight: false,
                },
                {
                  label: 'Premium',
                  price: '$20',
                  sceneLength: '10 seconds each',
                  total: '60 seconds',
                  best: 'Deep immersion',
                  highlight: true,
                },
              ].map((pkg) => (
                <div key={pkg.label} style={{
                  background: pkg.highlight ? 'rgba(201,169,97,0.07)' : BG_CARD2,
                  border: `1px solid ${pkg.highlight ? 'rgba(201,169,97,0.35)' : BORDER}`,
                  borderRadius: '8px', padding: '36px 28px',
                }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: '12px' }}>{pkg.label}</p>
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: '3.2rem', fontWeight: 200, color: TEXT, lineHeight: 1, marginBottom: '28px' }}>{pkg.price}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {[
                      ['Scenes', '6'],
                      ['Scene length', pkg.sceneLength],
                      ['Total video', pkg.total],
                      ['Best for', pkg.best],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ color: TEXT_MUTED }}>{k}</span>
                        <span style={{ color: TEXT }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <CTAButton style={{ width: '100%', padding: '14px', background: pkg.highlight ? GOLD : 'transparent', color: pkg.highlight ? '#0A0908' : GOLD, border: `1px solid ${GOLD}` }}>
                    Get Started
                  </CTAButton>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY DIFFERENT ── */}
        <section style={{ padding: 'clamp(64px,10vw,100px) 20px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <Label>Why YourVision is Different</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '52px', color: '#FFFFFF',
            }}>
              Every other tool generates a generic dream life.<br />
              <em style={{ fontStyle: 'italic', color: GOLD_LIGHT }}>We put you in it.</em>
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: TEXT_MUTED, fontWeight: 400, borderBottom: `1px solid ${BORDER}` }}></th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: TEXT_MUTED, fontWeight: 400, borderBottom: `1px solid ${BORDER}` }}>Other AI Tools</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: GOLD_LIGHT, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>YourVision</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Your face in every scene', '✗', '✓'],
                    ['End-to-end — nothing to edit', '✗', '✓'],
                    ['Purpose-built for daily practice', '✗', '✓'],
                    ['Works in under 5 minutes', '✗', '✓'],
                  ].map(([feature, others, ours], i) => (
                    <tr key={feature} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '16px', color: TEXT_DIM, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{feature}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: others === '✗' ? '#6B6560' : TEXT_MUTED, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{others}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: others === '✗' ? GOLD_LIGHT : TEXT, fontWeight: 400, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>{ours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── PSYCHOLOGY ── */}
        <section style={{ padding: 'clamp(64px,10vw,100px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <Label>The Science</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '32px', color: '#FFFFFF',
            }}>
              Why Seeing Your Face Changes Everything
            </h2>
            <p style={{ fontSize: '1rem', color: TEXT_DIM, lineHeight: 1.9, marginBottom: '20px' }}>
              When you look at a vision board full of strangers living your dream life, your brain is polite about it — mildly inspired, then quickly indifferent. It knows it&apos;s not you.
            </p>
            <p style={{ fontSize: '1rem', color: TEXT_DIM, lineHeight: 1.9, marginBottom: '20px' }}>
              When you see <em style={{ color: TEXT, fontStyle: 'italic' }}>your own face</em> in those scenes — moving, present, already there — the brain&apos;s response is categorically different. Identity research and future-self psychology (including the work of Dr. Joe Dispenza) consistently show that this kind of first-person visualization accelerates the gap between imagined and lived experience.
            </p>
            <p style={{ fontSize: '1rem', color: TEXT_DIM, lineHeight: 1.9 }}>
              That&apos;s not a marketing claim. It&apos;s why athletes visualize in the first person. It&apos;s why the image matters. And it&apos;s why we built YourVision the way we did.
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding: 'clamp(80px,12vw,140px) 20px', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.8rem,5vw,3.2rem)',
              fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.02em',
              marginBottom: '20px', color: '#FFFFFF',
            }}>
              Your future self is waiting.
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: '1rem', lineHeight: 1.7, marginBottom: '44px' }}>
              Create your vision video today.
            </p>
            <CTAButton>Create My Vision Video — Starting at $12</CTAButton>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
