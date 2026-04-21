import { useRouter } from 'next/router'

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-border">{title}</h2>
    <div className="space-y-3 text-gray-400 text-sm leading-relaxed">{children}</div>
  </section>
)

export default function TermsOfService() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-void text-white">
      {/* Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/')}
            className="text-glow-soft font-semibold tracking-wide text-sm">
            YourVision<span className="text-gray-500">.video</span>
          </button>
          <span className="text-xs text-gray-500">Legal</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500">Last updated: April 20, 2025</p>
        </div>

        <Section title="1. Agreement to Terms">
          <p>
            By accessing or using YourVision (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
          <p>
            YourVision is operated by its founders (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            YourVision is an AI-powered creative service that generates personalized cinematic vision videos. You upload a photo of your face, describe your aspirations, and our pipeline — using multiple AI systems — produces a short video featuring your likeness in cinematic scenes.
          </p>
          <p>
            The Service involves: AI image generation (Flux), AI face-swap technology (PiAPI), AI video animation (Kling), and automated video assembly (Shotstack). Each step is automated and results may vary.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>You must be at least 18 years old to use YourVision. By using the Service, you represent and warrant that:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>You are 18 years of age or older.</li>
            <li>You have the legal capacity to enter into these Terms.</li>
            <li>You are not located in a jurisdiction where use of this Service is prohibited.</li>
          </ul>
        </Section>

        <Section title="4. User Accounts">
          <p>
            You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately at{' '}
            <a href="mailto:hello@yourvision.video" className="text-glow-soft hover:underline">hello@yourvision.video</a>{' '}
            if you suspect unauthorized access.
          </p>
        </Section>

        <Section title="5. Photo Upload &amp; Biometric Data Consent">
          <p>
            <strong className="text-gray-200">This section is critically important.</strong> By uploading a photo of your face, you explicitly consent to the following:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-gray-200">AI Face Processing:</strong> Your facial image will be processed by automated AI systems to detect, analyze, and composite your likeness into generated scenes.
            </li>
            <li>
              <strong className="text-gray-200">Third-Party Processing:</strong> Your image will be transmitted to and processed by our AI vendors (including PiAPI and associated upstream services) solely for the purpose of generating your video.
            </li>
            <li>
              <strong className="text-gray-200">You must only upload your own photo.</strong> Uploading photos of other individuals without their explicit consent is strictly prohibited.
            </li>
            <li>
              <strong className="text-gray-200">Deletion:</strong> Your uploaded photo is retained only as long as necessary to generate and deliver your video. You may request deletion at any time by contacting us.
            </li>
          </ul>
          <p>
            By proceeding past the consent checkbox on the upload screen, you confirm you have read and agree to this biometric data processing.
          </p>
        </Section>

        <Section title="6. Payments &amp; Refund Policy">
          <p>
            YourVision charges a fee per completed vision video. Payment is processed via Stripe. All prices are displayed at checkout and include applicable taxes where required.
          </p>
          <p>
            <strong className="text-gray-200">Refunds:</strong> Because each video is custom-generated using AI compute resources, refunds are not available once video generation has begun. If generation fails due to a technical error on our end, you will receive a full refund or a complimentary regeneration at our discretion.
          </p>
          <p>
            If you are dissatisfied with the output, please contact us at{' '}
            <a href="mailto:hello@yourvision.video" className="text-glow-soft hover:underline">hello@yourvision.video</a>.
            We handle disputes on a case-by-case basis and will always try to make it right.
          </p>
        </Section>

        <Section title="7. Intellectual Property &amp; Ownership of Output">
          <p>
            <strong className="text-gray-200">Your video:</strong> Upon payment and delivery, you own the right to use your generated video for personal, non-commercial purposes (sharing on social media, personal motivation, etc.).
          </p>
          <p>
            <strong className="text-gray-200">Commercial use:</strong> Use of your generated video for commercial purposes (advertising, monetized content, resale) requires prior written approval from YourVision.
          </p>
          <p>
            <strong className="text-gray-200">Our platform:</strong> All software, AI prompts, pipeline design, and branding remain the intellectual property of YourVision. You may not reverse engineer, copy, or redistribute our system.
          </p>
          <p>
            <strong className="text-gray-200">AI-generated content:</strong> You acknowledge that the scenes and environments in your video are AI-generated and may not be copyrightable in all jurisdictions. We make no warranties regarding IP ownership of AI-generated elements.
          </p>
        </Section>

        <Section title="8. Prohibited Uses">
          <p>You may not use YourVision to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Upload photos of individuals other than yourself without their consent.</li>
            <li>Generate content that is sexually explicit, violent, hateful, or otherwise illegal.</li>
            <li>Create deepfakes intended to deceive, defame, or harm any person.</li>
            <li>Attempt to circumvent payment, access controls, or abuse free credits.</li>
            <li>Use automated tools to scrape, spam, or overload our systems.</li>
            <li>Impersonate any person, entity, or AI system.</li>
          </ul>
          <p>
            Violation of these restrictions may result in immediate account termination and, where applicable, referral to law enforcement.
          </p>
        </Section>

        <Section title="9. AI Limitations &amp; No Guarantee of Results">
          <p>
            YourVision uses cutting-edge AI technology, but AI outputs are inherently unpredictable. We do not guarantee that:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Your likeness will be perfectly represented in every scene.</li>
            <li>The video will match your exact vision or description.</li>
            <li>All scenes will be successfully generated on the first attempt.</li>
          </ul>
          <p>
            We provide retry tools and quality controls to maximize satisfaction, but the nature of AI generation means variation is inherent to the process.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, YourVision and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of revenue, loss of data, or emotional distress.
          </p>
          <p>
            Our total liability to you for any claim arising from the Service shall not exceed the amount you paid for the specific transaction giving rise to the claim.
          </p>
        </Section>

        <Section title="11. Disclaimer of Warranties">
          <p>
            The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
          </p>
        </Section>

        <Section title="12. Termination">
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, for violation of these Terms or for any conduct we determine to be harmful to YourVision or its users. You may terminate your account at any time by contacting us.
          </p>
        </Section>

        <Section title="13. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to binding arbitration or resolved in the competent courts of Delaware.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            For questions, concerns, or legal notices regarding these Terms, please contact us at:{' '}
            <a href="mailto:hello@yourvision.video" className="text-glow-soft hover:underline">
              hello@yourvision.video
            </a>
          </p>
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
  )
}
