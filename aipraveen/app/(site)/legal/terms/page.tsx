import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section, P, UL, LI } from "@/components/legal";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of aipraveen.com and its courses, kits, competitions and workshops.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="23 JULY 2026"
      intro="These Terms govern your access to and use of aipraveen.com (the “Platform”), operated by Praveen Dalal, Goa, India (“we”, “us”). By using the Platform or buying anything on it, you agree to these Terms."
    >
      <Section heading="1. Who can use the Platform">
        <P>
          The Platform is intended for students and self-learners. You must be at least 18 years old, or 13–17 with the
          consent and supervision of a parent or guardian, and able to form a binding contract under Indian law. You are
          responsible for keeping your account secure.
        </P>
      </Section>

      <Section heading="2. Accounts and passwordless login">
        <P>
          Sign-in is passwordless: we email a one-time magic link that is valid for 15 minutes. You are responsible for
          activity under your account and for the security of the email inbox you sign in with. Accounts are personal to
          you and may not be shared.
        </P>
      </Section>

      <Section heading="3. Purchases, access and pricing">
        <UL>
          <LI>Prices are shown in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.</LI>
          <LI>Every paid purchase grants one year of on-platform access from the date of purchase.</LI>
          <LI>Content is streamed and viewed on the Platform only — there are no downloads, and access is not transferable.</LI>
          <LI>Renewals are optional and never automatic; you are charged only if you choose to renew.</LI>
          <LI>Payments are processed by Razorpay. We do not receive or store your full card or bank details.</LI>
        </UL>
      </Section>

      <Section heading="4. No refunds">
        <P>
          All purchases are final and non-refundable. Please review our{" "}
          <Link href={routes.refund}>Refund &amp; Cancellation Policy</Link> before buying — it forms part of these
          Terms.
        </P>
      </Section>

      <Section heading="5. Licence to use content">
        <P>
          On purchase, we grant you a limited, personal, non-exclusive, non-transferable, revocable licence to access
          and view the purchased content for your own learning during your access period. You may not copy, download,
          record, resell, sub-licence, publicly display or redistribute any course video, resource or material. All
          course content, curriculum, text, graphics and software on the Platform are our intellectual property or that
          of our licensors.
        </P>
      </Section>

      <Section heading="6. Your submissions and portfolio">
        <P>
          When you submit a project to the practice library or your portfolio, you keep ownership of your work. You
          grant us a licence to host, display and share it on the Platform and on your public portfolio page. You
          confirm you have the right to submit it and that it does not infringe anyone else’s rights or contain unlawful
          content. We may review, decline, edit the presentation of, or remove submissions, and may provide feedback on
          them.
        </P>
      </Section>

      <Section heading="7. Competitions and workshops">
        <P>
          Competition entries and workshop seats are subject to their stated briefs, deadlines, eligibility and
          capacity, and to the <Link href={routes.refund}>Refund &amp; Cancellation Policy</Link>. Judging decisions and
          prize awards are final and at the organiser’s discretion.
        </P>
      </Section>

      <Section heading="8. Acceptable use">
        <UL>
          <LI>Do not share, resell or circumvent access controls, or scrape or bulk-download content.</LI>
          <LI>Do not upload unlawful, infringing, harmful or misleading material.</LI>
          <LI>Do not attempt to disrupt, reverse-engineer or gain unauthorised access to the Platform.</LI>
        </UL>
        <P>We may suspend or terminate access that breaches these Terms, without refund.</P>
      </Section>

      <Section heading="9. Self-paced, no live support">
        <P>
          Courses are self-paced by design. We do not provide live classes, calls or Q&amp;A sessions. The Platform and
          its content are provided for educational purposes and on an “as is” and “as available” basis, without
          warranties of any kind, to the extent permitted by law.
        </P>
      </Section>

      <Section heading="10. Limitation of liability">
        <P>
          To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential losses. To
          the extent liability cannot be excluded, our total liability for any claim is limited to the amount you paid
          for the product giving rise to the claim.
        </P>
      </Section>

      <Section heading="11. Changes and governing law">
        <P>
          We may update these Terms from time to time; the “last updated” date reflects the current version, and
          continued use means you accept the changes. These Terms are governed by the laws of India, and the courts at
          Goa, India shall have exclusive jurisdiction.
        </P>
      </Section>

      <Section heading="12. Contact">
        <P>
          Questions about these Terms? Write to <a href="mailto:hello@aipraveen.com">hello@aipraveen.com</a>. See also
          our <Link href={routes.privacy}>Privacy Policy</Link>.
        </P>
      </Section>
    </LegalShell>
  );
}
