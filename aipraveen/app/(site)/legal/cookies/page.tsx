import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Section, P, UL, LI } from "@/components/legal";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How aipraveen.com uses cookies. We use a single essential cookie to keep you signed in — no advertising or tracking cookies.",
};

export default function CookiePolicyPage() {
  return (
    <LegalShell
      title="Cookie Policy"
      updated="23 JULY 2026"
      intro="This policy explains the cookies aipraveen.com uses. In short: we use one essential cookie to keep you signed in, and no advertising or cross-site tracking cookies."
    >
      <Section heading="What cookies are">
        <P>
          Cookies are small text files a website stores on your device. They let a site remember things between page
          views — for example, that you are signed in.
        </P>
      </Section>

      <Section heading="The cookies we use">
        <UL>
          <LI>
            <strong>Essential — session cookie (<code>aip_session</code>):</strong> set after you sign in with a magic
            link, so you stay signed in as you move around the Platform. It is strictly necessary — without it you
            cannot use your account. It is HTTP-only (not readable by scripts) and expires when your session ends.
          </LI>
          <LI>
            <strong>Preference — cookie acknowledgement:</strong> once you accept this notice, we remember that in your
            browser so we don’t show the banner again. This is stored locally in your browser, not used to track you.
          </LI>
        </UL>
        <P>
          We do <strong>not</strong> use advertising cookies, analytics profiling, or cross-site tracking cookies.
        </P>
      </Section>

      <Section heading="Third-party cookies">
        <P>
          When you pay, our payment provider (Razorpay) and, when you watch a lesson, our video provider may set their
          own cookies to make the payment window and video player work securely. These are controlled by those
          providers under their own policies.
        </P>
      </Section>

      <Section heading="Managing cookies">
        <P>
          You can block or delete cookies in your browser settings. Note that if you block the essential session
          cookie, you will not be able to stay signed in or access purchased content.
        </P>
      </Section>

      <Section heading="Consent">
        <P>
          By continuing to use the Platform and accepting the cookie notice, you consent to our use of the essential
          cookie described above. This policy should be read with our{" "}
          <Link href={routes.privacy}>Privacy Policy</Link> and{" "}
          <Link href={routes.terms}>Terms of Service</Link>.
        </P>
      </Section>

      <Section heading="Contact">
        <P>
          Questions? Write to <a href="mailto:hello@aipraveen.com">hello@aipraveen.com</a>.
        </P>
      </Section>
    </LegalShell>
  );
}
