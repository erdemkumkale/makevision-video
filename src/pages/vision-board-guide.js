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
        <Link href="/how-it-works" style={{ fontSize: '0.78rem', color: TEXT_MUTED, textDecoration: 'none', letterSpacing: '0.06em' }}>How It Works</Link>
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

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: '22px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: TEXT, fontSize: '0.95rem', fontWeight: 300, lineHeight: 1.5 }}>{q}</span>
        <span style={{ color: GOLD, fontSize: '1.2rem', fontWeight: 200, flexShrink: 0, transition: 'transform 200ms', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', lineHeight: 1.85, fontWeight: 300, paddingBottom: '22px' }}>{a}</p>
      )}
    </div>
  )
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best AI vision board generator?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'YourVision.video is the only AI vision board generator that puts your actual face into every scene of a cinematic video. Most tools produce generic images or slideshows — YourVision delivers a personalized manifestation video with your face composited into each scene.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I make a vision board with my own face?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. YourVision uses face-swap AI technology to composite your face into every scene of your personalized video. You upload a selfie and we do the rest — no editing, no Photoshop skills needed.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long should a vision board video be?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Research on visualization practices suggests that 30–60 seconds of focused, emotionally engaging content is ideal for a daily ritual. YourVision offers 30-second (Essential) and 60-second (Premium) packages, both featuring 6 cinematic scenes.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens to my photo after I upload it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your photo is used solely to generate your personalized video. It is not stored beyond the processing period, not shared with third parties, and not used to train any AI model. You own the output video.',
      },
    },
    {
      '@type': 'Question',
      name: "What's the difference between a vision board and a manifestation video?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A vision board is a static collection of images representing your goals. A manifestation video brings those images to life — scenes play out in motion, with music, creating a more emotionally immersive experience. YourVision creates the latter, with your face in every scene.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does an AI vision board video cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'YourVision offers two packages: Essential at $12 (30 seconds, 5-second scenes) and Premium at $20 (60 seconds, 10-second scenes). Both include 6 personalized scenes with your face and an emotional music soundtrack.',
      },
    },
  ],
}

export default function VisionBoardGuide() {
  return (
    <>
      <Head>
        <title>AI Vision Board Guide 2026 | YourVision</title>
        <meta name="description" content="The complete guide to creating an AI vision board video in 2026. Tools, psychology, and how to put your own face in your manifestation video." />
        <meta property="og:title" content="AI Vision Board Guide 2026 | YourVision" />
        <meta property="og:description" content="The complete guide to creating an AI vision board video in 2026. Tools, psychology, and how to put your own face in your manifestation video." />
        <meta property="og:image" content="https://yourvision.video/og-image.jpg" />
        <meta property="og:url" content="https://yourvision.video/vision-board-guide" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
        />
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
          <Label>Vision Board Guide 2026</Label>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(2rem,6vw,4rem)',
            fontWeight: 300, lineHeight: 1.1, letterSpacing: '0.02em',
            marginBottom: '28px', color: '#FFFFFF',
          }}>
            The Complete Guide to<br />
            <em style={{ fontStyle: 'italic', color: GOLD_LIGHT }}>AI Vision Boards</em> in 2026
          </h1>
          <p style={{ fontSize: 'clamp(0.95rem,2vw,1.1rem)', fontWeight: 300, color: '#E8E3DA', lineHeight: 1.8, maxWidth: '580px', margin: '0 auto' }}>
            How to create a personalized vision board video that actually works — including tools, psychology, and a fully automated option that puts your face in every scene.
          </p>
        </section>

        {/* ── WHAT IS A VISION BOARD ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Label>The Foundation</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '32px', color: '#FFFFFF',
            }}>
              What Is a Vision Board? (And Why Most People Do It Wrong)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '0.97rem', color: TEXT_DIM, lineHeight: 1.9 }}>
              <p>
                A <strong style={{ color: TEXT, fontWeight: 400 }}>vision board</strong> is a curated collection of images, words, and symbols that represent the life you want to create. The classic version involves cutting photos from magazines, printing images from Pinterest, or assembling a digital slideshow — and placing it somewhere you&apos;ll see it daily.
              </p>
              <p>
                The concept is grounded in real psychology: repeated exposure to goal-aligned imagery primes your reticular activating system to notice opportunities you&apos;d otherwise miss. Visualization is used by elite athletes, high-performing executives, and anyone serious about deliberate self-creation.
              </p>
              <p>
                But here&apos;s the problem most people run into: the images on a traditional vision board don&apos;t feature <em style={{ color: TEXT }}>you</em>. You&apos;re looking at a stranger on a yacht, a stranger in a penthouse, a stranger crossing the finish line. Your brain — which is wired to filter out information that doesn&apos;t feel personally relevant — registers these images as fiction.
              </p>
              <p>
                The result: you look at the board for a few days, feel vaguely inspired, and then stop looking at it entirely. The emotional resonance never forms. The board never becomes part of your daily practice.
              </p>
              <p>
                A <strong style={{ color: TEXT, fontWeight: 400 }}>vision board with your face</strong> — and especially a <strong style={{ color: TEXT, fontWeight: 400 }}>personalized vision board video</strong> — solves this problem at the root. When you see yourself living your dream life, your nervous system responds as if the experience is real. That&apos;s the mechanism. And AI has finally made it accessible.
              </p>
            </div>
          </div>
        </section>

        {/* ── THE SCIENCE ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Label>Future-Self Psychology</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '32px', color: '#FFFFFF',
            }}>
              The Science of Future-Self Visualization
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '0.97rem', color: TEXT_DIM, lineHeight: 1.9 }}>
              <p>
                Dr. Joe Dispenza&apos;s research on <strong style={{ color: TEXT, fontWeight: 400 }}>future-self visualization</strong> demonstrates that the brain doesn&apos;t cleanly distinguish between a vividly imagined experience and a real one — especially when the emotional centers are engaged. The more specific and emotionally rich your visualization, the more your body begins to &quot;rehearse&quot; the future state.
              </p>
              <p>
                What makes a <strong style={{ color: TEXT, fontWeight: 400 }}>manifestation video</strong> more effective than a static board isn&apos;t just the motion. It&apos;s the presence of your face. Identity research shows that seeing yourself in a future scenario dramatically increases your brain&apos;s willingness to claim that scenario as possible — and possible futures are the ones we actively move toward.
              </p>
              <p>
                An <strong style={{ color: TEXT, fontWeight: 400 }}>AI vision board video</strong> with your face isn&apos;t just aesthetically compelling. It&apos;s neurologically different from any other visualization tool you&apos;ve tried.
              </p>
            </div>
          </div>
        </section>

        {/* ── TYPES COMPARISON ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <Label>Comparison</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '48px', color: '#FFFFFF',
            }}>
              Types of Vision Boards — Pros &amp; Cons
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    {['Type', 'Effort', 'Your face', 'Emotional impact', 'Daily usability'].map((h, i) => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: i === 0 ? 'left' : 'center',
                        color: TEXT_MUTED, fontWeight: 400,
                        borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['AI Video (YourVision)', 'None', '✓', 'Very High', 'Watch anywhere'],
                    ['Physical / magazine', 'High', '✗', 'Low', 'Must be near it'],
                    ['Pinterest board', 'Medium', '✗', 'Low', 'Easy but generic'],
                    ['Digital slideshow', 'Medium', 'Rare', 'Moderate', 'Decent'],
                    ['DIY AI workflow', 'Very High', 'Sometimes', 'High', 'Hard to maintain'],
                  ].map((row, i) => (
                    <tr key={row[0]} style={{
                      background: i === 0 ? 'rgba(201,169,97,0.06)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
                    }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{
                          padding: '14px',
                          textAlign: j === 0 ? 'left' : 'center',
                          color: i === 0 ? (j === 0 ? GOLD_LIGHT : TEXT) : (j === 0 ? TEXT : TEXT_MUTED),
                          fontWeight: i === 0 && j === 0 ? 400 : 300,
                          borderBottom: `1px solid rgba(255,255,255,0.04)`,
                        }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: '24px', fontSize: '0.85rem', color: TEXT_MUTED, lineHeight: 1.7 }}>
              AI video outperforms every other format on the factors that actually predict whether you&apos;ll use your vision board consistently: zero effort to view, high emotional resonance, and your face in the scene.
            </p>
          </div>
        </section>

        {/* ── HOW TO MAKE ONE ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Label>Step by Step</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '48px', color: '#FFFFFF',
            }}>
              How to Make an AI Vision Board Video
            </h2>

            <div style={{ marginBottom: '48px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: '20px' }}>Option A — DIY Workflow</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.92rem', color: TEXT_DIM, lineHeight: 1.8, paddingLeft: '16px', borderLeft: `2px solid rgba(255,255,255,0.08)` }}>
                <p>1. Write 6 detailed scene descriptions of your dream life</p>
                <p>2. Generate images in Midjourney or DALL-E (no face yet)</p>
                <p>3. Use a face-swap tool like Reface or DeepFaceLab to add your face</p>
                <p>4. Animate each image using Runway or Kling AI</p>
                <p>5. Edit clips together in CapCut or Premiere with music</p>
                <p style={{ color: '#6B6560' }}>⏱ Estimated time: 3–8 hours. Requires accounts across multiple platforms and technical patience.</p>
              </div>
            </div>

            <div style={{ background: 'rgba(201,169,97,0.06)', border: `1px solid rgba(201,169,97,0.2)`, borderRadius: '8px', padding: '28px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD_LIGHT, marginBottom: '20px' }}>Option B — YourVision.video</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem', color: TEXT_DIM, lineHeight: 1.8 }}>
                <p>1. Upload a clear selfie</p>
                <p>2. Describe your dream life in plain language</p>
                <p>3. Receive a finished video with your face in every scene</p>
                <p style={{ color: TEXT_MUTED }}>⏱ Estimated time: under 5 minutes. Starting at $12.</p>
              </div>
              <div style={{ marginTop: '24px' }}>
                <CTAButton style={{ padding: '13px 28px', fontSize: '0.85rem' }}>Create My Vision Board Video →</CTAButton>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT TO INCLUDE ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Label>What to Visualize</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '40px', color: '#FFFFFF',
            }}>
              What to Include in Your Vision Board
            </h2>
            <p style={{ fontSize: '0.95rem', color: TEXT_DIM, lineHeight: 1.85, marginBottom: '36px' }}>
              The most effective vision boards cover multiple life domains. Focusing only on money or career tends to produce an incomplete emotional picture — and the brain responds to the full context of a fulfilled life. Consider scenes from each of these categories:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { icon: '◆', title: 'Career & Purpose', desc: 'Your ideal work environment, the impact you make, recognition you receive' },
                { icon: '◆', title: 'Relationships', desc: 'Deep connection with partner, family, or close friends in meaningful moments' },
                { icon: '◆', title: 'Health & Vitality', desc: 'Your body at its best — active, energized, radiantly well' },
                { icon: '◆', title: 'Travel & Experience', desc: 'Specific places that call to you — the more vivid the better' },
                { icon: '◆', title: 'Abundance', desc: 'Financial freedom expressed as experiences, not just numbers' },
                { icon: '◆', title: 'Home & Environment', desc: 'The space you live in — its feeling, its light, its calm' },
                { icon: '◆', title: 'Personal Growth', desc: 'Who you are becoming — the version of you that has already arrived' },
              ].map((item) => (
                <div key={item.title} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '6px' }}>
                  <span style={{ color: GOLD, fontSize: '0.6rem', marginBottom: '10px', display: 'block' }}>{item.icon}</span>
                  <p style={{ color: TEXT, fontSize: '0.88rem', fontWeight: 400, marginBottom: '8px' }}>{item.title}</p>
                  <p style={{ color: TEXT_MUTED, fontSize: '0.8rem', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DAILY PRACTICE ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Label>Daily Practice</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '32px', color: '#FFFFFF',
            }}>
              How to Use Your Vision Board for Daily Practice
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem', color: TEXT_DIM, lineHeight: 1.9 }}>
              <p>
                <strong style={{ color: TEXT, fontWeight: 400 }}>Morning ritual:</strong> Watch your vision board video within the first 30 minutes of waking, before checking your phone or email. This anchors your nervous system in your future-self identity before the noise of the day sets in.
              </p>
              <p>
                <strong style={{ color: TEXT, fontWeight: 400 }}>Before sleep:</strong> A second viewing before bed allows your subconscious to process the imagery during sleep. Keep the emotional activation high — don&apos;t just watch passively. Feel what it would feel like to already be there.
              </p>
              <p>
                <strong style={{ color: TEXT, fontWeight: 400 }}>Emotion activation:</strong> The mechanism isn&apos;t the watching — it&apos;s the feeling. Each time you view your personalized manifestation video, practice inhabiting the emotion of the scene, not just observing it. Gratitude, pride, joy, ease — choose the dominant emotion and sustain it.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: 'clamp(56px,9vw,90px) 20px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <Label>FAQ</Label>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.5rem,3.5vw,2.4rem)',
              fontWeight: 300, lineHeight: 1.2, letterSpacing: '0.03em',
              marginBottom: '40px', color: '#FFFFFF',
            }}>
              Frequently Asked Questions
            </h2>
            <div>
              {FAQ_SCHEMA.mainEntity.map((item) => (
                <FAQItem key={item.name} q={item.name} a={item.acceptedAnswer.text} />
              ))}
            </div>
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
              Ready to see yourself<br />in your dream life?
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: '1rem', lineHeight: 1.7, marginBottom: '44px' }}>
              Your personalized AI vision board video — with your face in every scene.
            </p>
            <CTAButton>Create My Personalized Vision Board Video →</CTAButton>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
