import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section, P, UL, LI } from "@/components/legal";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How aipraveen.com collects, uses and protects your personal data, and your rights under India's DPDP Act.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="23 JULY 2026"
      intro="This policy explains what personal data aipraveen.com (operated by Praveen Dalal, Goa, India) collects, why, and the rights you have under India's Digital Personal Data Protection Act, 2023 (DPDP)."
    >
      <Section heading="What we collect">
        <UL>
          <LI><strong>Account:</strong> your email address, and a display name if you provide one.</LI>
          <LI><strong>Purchases:</strong> orders, products bought, access/expiry dates and renewal history. Payments are handled by Razorpay — we do not receive or store your full card, UPI or bank details.</LI>
          <LI><strong>Learning:</strong> course progress, lessons completed, and reading progress.</LI>
          <LI><strong>Submissions:</strong> the projects you submit — title, description, who it’s for, tech stack, links, and any feedback exchanged.</LI>
          <LI><strong>Enquiries:</strong> details you enter in workshop, company, testimonial or waitlist forms.</LI>
          <LI><strong>Technical:</strong> a single essential session cookie to keep you signed in, and basic server logs.</LI>
        </UL>
      </Section>

      <Section heading="Why we use it">
        <UL>
          <LI>To create your account and sign you in via magic link.</LI>
          <LI>To give you access to what you bought and track your progress.</LI>
          <LI>To review and publish your portfolio work and send you feedback.</LI>
          <LI>To send transactional emails — login links, receipts, and access-expiry reminders.</LI>
          <LI>To respond to your enquiries and to operate, secure and improve the Platform.</LI>
        </UL>
        <P>
          We process your data to perform our contract with you, to comply with law, and — where required — with your
          consent (which you may withdraw at any time).
        </P>
      </Section>

      <Section heading="Who we share it with">
        <P>We do not sell your personal data. We share the minimum necessary with service providers who help us run the Platform:</P>
        <UL>
          <LI><strong>Razorpay</strong> — payment processing.</LI>
          <LI><strong>Our email provider</strong> — to deliver login links and receipts.</LI>
          <LI><strong>Our hosting, database and video providers</strong> — to store data and stream content.</LI>
        </UL>
        <P>
          Your <em>published</em> portfolio projects are, by design, publicly visible on your shareable portfolio page.
          Feedback and unpublished work remain private to you.
        </P>
      </Section>

      <Section heading="Where your data is stored">
        <P>
          We aim to host personal data in India. Some service providers may process limited data outside India; where
          that happens, we take reasonable steps to ensure it is protected consistent with applicable law.
        </P>
      </Section>

      <Section heading="How long we keep it">
        <P>
          We keep your account and purchase records for as long as your account is active and as required for legal,
          tax and accounting purposes. Course progress is preserved across access expiry so it can be restored if you
          renew. You can ask us to delete your account (see below).
        </P>
      </Section>

      <Section heading="Security">
        <P>
          We use reasonable technical and organisational measures to protect your data, including passwordless login and
          encrypted transport. No system is perfectly secure, but we work to keep your information safe.
        </P>
      </Section>

      <Section heading="Your rights (DPDP)">
        <UL>
          <LI>Access the personal data we hold about you.</LI>
          <LI>Ask us to correct or complete inaccurate data.</LI>
          <LI>Ask us to erase your data, subject to legal retention requirements.</LI>
          <LI>Withdraw consent where processing is based on it.</LI>
          <LI>Raise a grievance and have it addressed.</LI>
        </UL>
        <P>
          To exercise any of these, email <a href="mailto:hello@aipraveen.com">hello@aipraveen.com</a>.
        </P>
      </Section>

      <Section heading="Children">
        <P>
          The Platform is aimed at students. If you are under 18, use it only with the consent and supervision of a
          parent or guardian. We do not knowingly collect data from children in violation of applicable law.
        </P>
      </Section>

      <Section heading="Grievance officer & contact">
        <P>
          For any privacy question, data request or complaint, contact our grievance officer at{" "}
          <a href="mailto:hello@aipraveen.com">hello@aipraveen.com</a>. We will acknowledge and address grievances within
          the timelines required by law.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          We may update this policy; the “last updated” date reflects the current version. Please also see our{" "}
          <Link href={routes.terms}>Terms of Service</Link> and{" "}
          <Link href={routes.refund}>Refund &amp; Cancellation Policy</Link>.
        </P>
      </Section>
    </LegalShell>
  );
}
