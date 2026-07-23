import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section, P, UL, LI } from "@/components/legal";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "All purchases on AIPRAVEEN.COM are final. Because access is granted immediately, purchases are non-refundable.",
};

export default function RefundPolicyPage() {
  return (
    <LegalShell
      title="Refund & Cancellation Policy"
      updated="23 JULY 2026"
      intro="This policy explains how payments, cancellations and refunds work for courses, kits, competition entries and workshops bought on aipraveen.com."
    >
      <Section heading="All sales are final">
        <P>
          Every product on aipraveen.com is a digital product that gives you complete, immediate access on
          purchase — full course videos, downloadable-free resources in the on-platform viewer, and the practice
          library. Because you receive the entire product the moment you pay, <strong>all purchases are final and
          non-refundable</strong>. Once a purchase is completed, we do not offer refunds, full or partial, including
          for change of mind, lack of use, or partial completion.
        </P>
      </Section>

      <Section heading="Decide before you buy">
        <P>We want you to buy with confidence, so we make it easy to evaluate a product first:</P>
        <UL>
          <LI>Every course has a free preview and a full, itemised curriculum listing exactly what is inside.</LI>
          <LI>The 100-project practice library is free to browse before you buy anything.</LI>
          <LI>Each product page states plainly who it is for — and who it is not for.</LI>
          <LI>
            Still unsure? Email <a href="mailto:support@aipraveen.com">support@aipraveen.com</a> before purchasing and
            we will answer honestly.
          </LI>
        </UL>
      </Section>

      <Section heading="Failed or interrupted payments">
        <P>
          If a payment fails or is interrupted, you are not charged. If any amount was debited for a failed or
          duplicate transaction, it is reversed automatically by the payment gateway, typically within 5–7 working
          days. No entitlement is created for a failed payment.
        </P>
      </Section>

      <Section heading="Duplicate or incorrect charges">
        <P>
          If you believe you were charged more than once for the same order, or charged in error, contact{" "}
          <a href="mailto:support@aipraveen.com">support@aipraveen.com</a> within 7 days with your order number. We
          will investigate and, where a genuine duplicate or billing error is confirmed, reverse the erroneous charge.
          This is the only circumstance in which money is returned.
        </P>
      </Section>

      <Section heading="Renewals">
        <P>
          Access lasts one year from the date of purchase. Renewals are never automatic — you are only charged if you
          choose to renew. A renewal is a fresh purchase and is itself non-refundable once completed. Your progress and
          notes are preserved across expiry and restored on renewal.
        </P>
      </Section>

      <Section heading="Competition entries and workshops">
        <UL>
          <LI>Competition entry fees are non-refundable once you have registered, including if you do not submit an entry.</LI>
          <LI>
            Workshop and event seat fees are non-refundable. If a workshop is cancelled or rescheduled by us, you may
            transfer to another date or receive a credit; contact us to arrange this.
          </LI>
        </UL>
      </Section>

      <Section heading="Free products">
        <P>Free kits carry no charge and therefore no refund applies.</P>
      </Section>

      <Section heading="Contact">
        <P>
          Questions about this policy? Write to <a href="mailto:support@aipraveen.com">support@aipraveen.com</a>. This
          policy should be read together with our{" "}
          <Link href={routes.terms}>Terms of Service</Link> and{" "}
          <Link href={routes.privacy}>Privacy Policy</Link>.
        </P>
      </Section>
    </LegalShell>
  );
}
