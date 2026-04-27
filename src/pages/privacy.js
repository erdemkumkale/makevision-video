import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-border">{title}</h2>
    <div className="space-y-3 text-gray-400 text-sm leading-relaxed">{children}</div>
  </section>
)

const TableRow = ({ label, items }) => (
  <tr className="border-b border-border/50">
    <td className="py-3 pr-4 text-gray-300 font-medium align-top whitespace-nowrap">{label}</td>
    <td className="py-3 text-gray-400">{items}</td>
  </tr>
)

export default function PrivacyPolicy() {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>Privacy Policy — YourVision</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,200;0,300;1,200;1,300&display=swap" rel="stylesheet" />
      </Head>
    <div className="min-h-screen bg-void text-white">
      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid #1F1D1A', padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
        fontFamily: "'General Sans', system-ui, sans-serif",
      }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 300, letterSpacing: '0.06em', color: '#F4F1EA' }}>
          YourVision
        </button>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/terms" style={{ fontSize: '0.78rem', color: '#C5BFB8', textDecoration: 'none', letterSpacing: '0.06em' }}>Terms</Link>
          <span style={{ fontSize: '0.75rem', color: '#4A4640', letterSpacing: '0.08em' }}>Privacy</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A961', marginBottom: '16px', fontFamily: "'General Sans', system-ui, sans-serif" }}>Legal</span>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '0.03em', marginBottom: '8px' }}>Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: April 20, 2025</p>
        </div>

        <div className="bg-panel border border-yellow-800/40 rounded-xl px-5 py-4 mb-10">
          <p className="text-sm text-yellow-300/80 leading-relaxed">
            <strong className="text-yellow-300">Important:</strong> YourVision processes your facial image using AI technology.
            This Privacy Policy explains exactly what data we collect, how we use it, who we share it with,
            and how you can request its deletion.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            YourVision (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the YourVision service at yourvision.video.
            We are responsible for the personal data you provide when using our platform.
          </p>
          <p>
            Contact: <a href="mailto:hello@yourvision.video" className="text-glow-soft hover:underline">hello@yourvision.video</a>
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p>We collect the following categories of personal data:</p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left text-gray-300 font-medium">Data Type</th>
                  <th className="py-2 text-left text-gray-300 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                <TableRow label="Account data" items="Email address, name, profile picture (from Google OAuth)" />
                <TableRow label="Facial image" items="The selfie you upload for video generation (biometric data)" />
                <TableRow label="Creative input" items="Your dream life description, goals, and aspirations" />
                <TableRow label="Generated content" items="AI-generated images and videos produced for your project" />
                <TableRow label="Payment data" items="Processed by Stripe. We do not store card numbers. We receive confirmation of successful payment only." />
                <TableRow label="Usage data" items="Page visits, feature usage, error logs (for debugging)" />
                <TableRow label="Device data" items="Browser type, OS, IP address (standard web server logs)" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use your personal data for the following purposes:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-gray-200">Service delivery:</strong> To generate your personalized vision video using AI tools.</li>
            <li><strong className="text-gray-200">Account management:</strong> To create and maintain your account and authenticate you.</li>
            <li><strong className="text-gray-200">Payment processing:</strong> To process your payment via Stripe.</li>
            <li><strong className="text-gray-200">Notifications:</strong> To send you an email when your video is ready.</li>
            <li><strong className="text-gray-200">Support:</strong> To respond to your inquiries and resolve issues.</li>
            <li><strong className="text-gray-200">Security:</strong> To detect and prevent fraud, abuse, or unauthorized access.</li>
            <li><strong className="text-gray-200">Improvement:</strong> To analyze aggregate usage patterns and improve the Service. We do not use your personal video or facial image to train AI models.</li>
          </ul>
        </Section>

        <Section title="4. Biometric &amp; Facial Data — Special Notice">
          <p>
            Your facial image is classified as <strong className="text-gray-200">biometric data</strong> in many jurisdictions (including under GDPR, CCPA/CPRA, and Turkish KVKK law). We treat it with heightened protection:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Your photo is collected <strong className="text-gray-200">only</strong> to generate your video.</li>
            <li>It is transmitted to our AI processing vendors (see Section 5) solely for face compositing.</li>
            <li>We do <strong className="text-gray-200">not</strong> use your facial image to build facial recognition databases.</li>
            <li>We do <strong className="text-gray-200">not</strong> sell, license, or share your facial image with any advertising or data broker.</li>
            <li>We do <strong className="text-gray-200">not</strong> use your facial image to train AI models without your explicit, separate consent.</li>
            <li>Your uploaded image is retained in secure cloud storage only as long as needed and may be deleted upon request.</li>
          </ul>
          <p>
            By using YourVision, you provide explicit, informed consent to this processing, as acknowledged by the consent checkbox during upload.
          </p>
        </Section>

        <Section title="5. Third-Party Services We Use">
          <p>To deliver the Service, we share data with the following trusted third parties. Each is bound by their own privacy policies and data processing agreements:</p>

          <div className="space-y-4 mt-4">
            {[
              {
                name: 'Supabase',
                role: 'Database, file storage, authentication',
                data: 'Account data, uploaded images, generated content',
                link: 'https://supabase.com/privacy',
              },
              {
                name: 'PiAPI',
                role: 'AI image generation and face-swap processing',
                data: 'Your uploaded selfie and AI-generated images (for face compositing)',
                link: 'https://piapi.ai',
              },
              {
                name: 'Google Gemini',
                role: 'AI scene prompt generation',
                data: 'Your text description of aspirations (no images)',
                link: 'https://policies.google.com/privacy',
              },
              {
                name: 'Kling (Kuaishou)',
                role: 'AI video animation',
                data: 'AI-generated scene images (for animation)',
                link: 'https://kling.kuaishou.com',
              },
              {
                name: 'Shotstack',
                role: 'Video assembly and rendering',
                data: 'Generated video clips and audio',
                link: 'https://shotstack.io/privacy',
              },
              {
                name: 'Stripe',
                role: 'Payment processing',
                data: 'Payment information (processed directly by Stripe)',
                link: 'https://stripe.com/privacy',
              },
              {
                name: 'Resend',
                role: 'Transactional email (video ready notification)',
                data: 'Your email address',
                link: 'https://resend.com/privacy',
              },
              {
                name: 'Vercel',
                role: 'Web hosting and CDN',
                data: 'Standard request logs, IP address',
                link: 'https://vercel.com/legal/privacy-policy',
              },
            ].map(svc => (
              <div key={svc.name} className="bg-panel border border-border rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-gray-200 font-medium text-sm">{svc.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{svc.role}</p>
                    <p className="text-gray-400 text-xs mt-1">Data shared: {svc.data}</p>
                  </div>
                  <a href={svc.link} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-glow-soft/70 hover:text-glow-soft whitespace-nowrap flex-shrink-0 mt-0.5">
                    Privacy Policy →
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4">
            We do not sell your personal data to any third party. We do not share your data with advertisers.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your data for the following periods:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-gray-200">Account data:</strong> Until you delete your account.</li>
            <li><strong className="text-gray-200">Uploaded selfie:</strong> Stored for the duration of your active projects. Deleted upon request or after 90 days of account inactivity.</li>
            <li><strong className="text-gray-200">Generated videos and images:</strong> Stored for your access until you delete them or close your account.</li>
            <li><strong className="text-gray-200">Payment records:</strong> Retained as required by financial and tax regulations (typically 7 years).</li>
            <li><strong className="text-gray-200">Server logs:</strong> Automatically deleted after 30 days.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>
            Depending on your location, you may have the following rights regarding your personal data.
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:hello@yourvision.video" className="text-glow-soft hover:underline">hello@yourvision.video</a>:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-gray-200">Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong className="text-gray-200">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong className="text-gray-200">Deletion:</strong> Request deletion of your personal data, including your uploaded facial image.</li>
            <li><strong className="text-gray-200">Portability:</strong> Request your data in a structured, machine-readable format (GDPR/KVKK).</li>
            <li><strong className="text-gray-200">Withdraw consent:</strong> Withdraw your consent to biometric data processing at any time. Note that withdrawal prevents future video generation.</li>
            <li><strong className="text-gray-200">Object to processing:</strong> Object to certain types of data processing.</li>
            <li><strong className="text-gray-200">Opt out of sale (CCPA):</strong> We do not sell personal data, so this right is inherently satisfied.</li>
          </ul>
          <p>We will respond to all legitimate requests within 30 days.</p>
        </Section>

        <Section title="8. Cookies">
          <p>
            YourVision uses essential cookies and browser storage (localStorage) to maintain your login session and store temporary project data. We do not use advertising cookies or third-party tracking pixels.
          </p>
          <p>
            You can disable cookies in your browser settings, but doing so will prevent you from logging in or using the Service.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            We implement industry-standard security measures including:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>TLS/HTTPS encryption for all data in transit.</li>
            <li>Secure cloud storage with access controls (Supabase Storage).</li>
            <li>Signed, time-limited URLs for accessing your media files.</li>
            <li>Row-level security on database tables ensuring users can only access their own data.</li>
          </ul>
          <p>
            No system is perfectly secure. In the event of a data breach affecting your personal data, we will notify you as required by applicable law.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>
            YourVision is not intended for, and does not knowingly collect personal data from, individuals under 18 years of age. If you believe a minor has provided us with personal data, contact us immediately and we will delete it.
          </p>
        </Section>

        <Section title="11. International Data Transfers">
          <p>
            Your data may be processed in countries outside your own, including the United States and the European Union, by the third-party services listed in Section 5. Each of these services is subject to data protection standards appropriate for international transfers (e.g., Standard Contractual Clauses under GDPR, or equivalent frameworks).
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes by email or by posting a notice on the Service. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision. Continued use of the Service after changes constitutes acceptance.
          </p>
        </Section>

        <Section title="13. Contact Us">
          <p>
            For any privacy-related questions, data requests, or concerns, contact us at:
          </p>
          <div className="bg-panel border border-border rounded-xl px-5 py-4 mt-2">
            <p className="text-gray-200 font-medium">YourVision</p>
            <p className="mt-1">
              <a href="mailto:hello@yourvision.video" className="text-glow-soft hover:underline">hello@yourvision.video</a>
            </p>
            <p className="text-gray-500 text-xs mt-2">We aim to respond to all privacy inquiries within 5 business days.</p>
          </div>
        </Section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-gray-600">
        <div className="flex justify-center gap-6">
          <button onClick={() => router.push('/terms')} className="hover:text-gray-400 transition-colors">Terms of Service</button>
          <button onClick={() => router.push('/privacy')} className="hover:text-gray-400 transition-colors">Privacy Policy</button>
          <a href="mailto:hello@yourvision.video" className="hover:text-gray-400 transition-colors">Contact</a>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} YourVision. All rights reserved.</p>
      </footer>
    </div>
    </>
  )
}
