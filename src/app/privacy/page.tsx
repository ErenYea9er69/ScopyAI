import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ScopyAI Privacy Policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div className="max-w-[740px] mx-auto px-7 py-12">
        <div className="mb-10">
          <span className="font-mono text-[10px] text-accent tracking-[0.1em] uppercase">Legal</span>
          <h1 className="text-[28px] font-medium mt-2">Privacy Policy</h1>
          <p className="text-[13px] text-muted mt-2">Last updated: March 28, 2026</p>
        </div>

        <div className="prose-dark space-y-8">
          <section>
            <h2 className="text-[18px] font-medium mb-3">1. Introduction</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8]">
              ScopyAI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the ScopyAI market intelligence platform (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">2. Information We Collect</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8] mb-3">We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-2 text-[14px] text-muted-2 leading-[1.8]">
              <li><strong className="text-text">Account Information:</strong> Email address, name, and password when you create an account.</li>
              <li><strong className="text-text">Intake Data:</strong> Niche descriptions, competitor URLs, geographic preferences, and other market research inputs you submit through our intake forms.</li>
              <li><strong className="text-text">Payment Information:</strong> Billing details are processed securely by Stripe, Inc. We do not store your full credit card number.</li>
              <li><strong className="text-text">Usage Data:</strong> Pages visited, features used, report generation history, and interaction patterns to improve our Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-[14px] text-muted-2 leading-[1.8]">
              <li>To generate and deliver market intelligence reports based on your inputs.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To communicate with you about your account, updates, and promotional offers.</li>
              <li>To improve, personalize, and expand our Service.</li>
              <li>To detect and prevent fraud or abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">4. AI-Generated Content</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8]">
              Our Service uses third-party AI models and web research APIs to generate intelligence reports. Your intake data (niche descriptions, competitor URLs) is sent to these providers solely for the purpose of generating your report. We do not sell your intake data. AI providers may process data according to their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">5. Data Retention</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8]">
              We retain your generated reports and account data for as long as your account is active. You may request deletion of your data at any time by contacting us at <a href="mailto:privacy@scopyai.com" className="text-accent hover:underline">privacy@scopyai.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">6. Your Rights (GDPR/CCPA)</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8] mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-[14px] text-muted-2 leading-[1.8]">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your personal data.</li>
              <li>Object to or restrict certain processing activities.</li>
              <li>Data portability — receive your data in a machine-readable format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">7. Cookies</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8]">
              We use essential cookies to maintain session state and preferences. We do not use third-party advertising cookies. Analytics cookies (if enabled) are anonymized and used solely to improve the Service.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-medium mb-3">8. Contact Us</h2>
            <p className="text-[14px] text-muted-2 leading-[1.8]">
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@scopyai.com" className="text-accent hover:underline">privacy@scopyai.com</a>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
