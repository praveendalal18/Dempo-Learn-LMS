import { type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const ORG = "Srinivassa Sinai Dempo College (Autonomous), Goa";
const SCHOOL = "Dempo AI Business School";
const APP = "Dempo Learn";
const CONTACT = "[privacy@your-college-domain]"; // replace with the real grievance/contact email
const UPDATED = "24 July 2026";

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 md:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={import.meta.env.BASE_URL + "logo.png"} alt="" className="w-7 h-7 rounded-md" />
            <span className="font-semibold text-[15px]">{APP}</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 md:px-8 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>
            This is a starting-point template, not legal advice. Please have it reviewed and
            customised by a qualified lawyer (including for India's DPDP Act, 2023 and any GDPR
            exposure) before you rely on it, and replace all bracketed placeholders.
          </span>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none mt-8 prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-8 prose-a:text-info">
          {children}
        </div>

        <LegalFooter />
      </main>
    </div>
  );
}

export function LegalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>© {year} {ORG}. All rights reserved.</span>
      <nav className="flex items-center gap-4">
        <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
        <Link href="/legal/cookies" className="hover:text-foreground">Cookies</Link>
      </nav>
    </footer>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        {APP} is operated by {ORG} through {SCHOOL} ("we", "us", "the Institute"). This policy
        explains what personal data we collect from students, faculty and staff who use {APP}, how
        we use it, and the rights you have under India's Digital Personal Data Protection Act, 2023
        (the "DPDP Act").
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li><strong>Account &amp; profile:</strong> name, email, role and profile details, managed through our authentication provider.</li>
        <li><strong>Coursework:</strong> assignments, submissions (text, files, links, recordings), quiz responses, grades, rubric marks and feedback.</li>
        <li><strong>Participation:</strong> attendance, discussion posts, notes, journal entries, course feedback and messages.</li>
        <li><strong>Usage:</strong> log and activity data (e.g. sign-ins, actions) and privacy-friendly, aggregate analytics.</li>
      </ul>

      <h2>How we use it</h2>
      <p>To provide the platform: enrolment, teaching, assessment and AI-assisted grading, feedback,
        oversight and analytics for the Institute, notifications, security and improving the service.
        Our legal basis is the delivery of educational services to you and our legitimate educational
        interests, consistent with the DPDP Act.</p>

      <h2>AI-assisted grading</h2>
      <p>Text submissions may be processed by an AI model to draft a suggested grade and feedback,
        which a human educator reviews before finalising. We use an India-based provider so that this
        processing stays within the country where feasible. AI never issues a final grade on its own.</p>

      <h2>Service providers</h2>
      <p>We share data only with processors that help us run {APP}, under contract and only as needed:
        authentication, database hosting, file storage, email/notifications, AI grading, and hosting/
        analytics. We do not sell your personal data.</p>

      <h2>Where your data is stored</h2>
      <p>We aim to host student data in India. Some providers may process limited data in other
        regions; where that happens we take steps consistent with the DPDP Act. [Confirm the exact
        regions of your database, storage and hosting and list them here.]</p>

      <h2>Retention</h2>
      <p>We keep personal data for as long as you have an account and as required for academic records
        and legal obligations, after which it is deleted or anonymised. [Set your retention periods.]</p>

      <h2>Your rights</h2>
      <p>Under the DPDP Act you may request access to, correction of, or erasure of your personal data,
        and may withdraw consent where processing relies on it. To exercise these rights or raise a
        grievance, contact our Grievance Officer at {CONTACT}. [Name your Grievance Officer.]</p>

      <h2>Security</h2>
      <p>We use industry-standard measures (encryption in transit, access controls, redaction of secrets
        in logs). No system is perfectly secure; please keep your credentials safe.</p>

      <h2>Cookies</h2>
      <p>We use only essential cookies needed to sign you in and keep you logged in. See our{" "}
        <Link href="/legal/cookies">Cookie Notice</Link> for details.</p>

      <h2>Children &amp; students</h2>
      <p>{APP} is used by enrolled students and staff. Where a user is a minor, processing is carried out
        in the context of the Institute's educational relationship; [add any parental-consent process
        your institution requires].</p>

      <h2>Changes &amp; contact</h2>
      <p>We may update this policy and will post the new date above. Questions: {CONTACT}.</p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Use">
      <p>These Terms govern your use of {APP}, operated by {ORG} through {SCHOOL}. By accessing or using
        {" "}{APP}, you agree to these Terms and to our <Link href="/legal/privacy">Privacy Policy</Link>.</p>

      <h2>Eligibility &amp; accounts</h2>
      <p>{APP} is invite-only for the Institute's enrolled students, faculty and staff. You are
        responsible for your account and for keeping your login credentials confidential. Notify us of
        any unauthorised use.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Use {APP} only for legitimate educational purposes.</li>
        <li>Do not share another person's data, harass others, or post unlawful or infringing content.</li>
        <li>Do not attempt to breach security, scrape, or disrupt the service.</li>
        <li>Follow the Institute's academic-integrity rules; work you submit must be your own or properly attributed.</li>
      </ul>

      <h2>Content &amp; intellectual property</h2>
      <p>Course materials, the {APP} software, and Institute branding are owned by the Institute or its
        licensors and are protected by copyright and other laws. You retain ownership of the work you
        submit, and grant the Institute a licence to use it for teaching, assessment and administration.
        You may not copy, redistribute or create derivative works from Institute or other users' content
        without permission.</p>

      <h2>AI-assisted grading</h2>
      <p>Some assessments use AI to draft grades and feedback for educator review. Final grades are set by
        a human educator. AI output may contain errors and is not a decision on its own.</p>

      <h2>Availability &amp; disclaimer</h2>
      <p>{APP} is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or
        error-free service. To the maximum extent permitted by law, the Institute is not liable for
        indirect or consequential damages arising from use of the platform.</p>

      <h2>Termination</h2>
      <p>We may suspend or terminate access for breach of these Terms or where required by the Institute's
        policies.</p>

      <h2>Governing law</h2>
      <p>These Terms are governed by the laws of India, with the courts at Goa having exclusive
        jurisdiction, subject to any applicable Institute regulations.</p>

      <h2>Changes &amp; contact</h2>
      <p>We may update these Terms and will post the new date above. Questions: {CONTACT}.</p>
    </LegalLayout>
  );
}

export function CookiesPage() {
  return (
    <LegalLayout title="Cookie Notice">
      <p>{APP} keeps cookies to a minimum.</p>
      <h2>Essential cookies</h2>
      <p>We use strictly necessary cookies to sign you in and maintain your session (set by our
        authentication provider). The app does not work without these, so they are always on.</p>
      <h2>Analytics</h2>
      <p>We use privacy-friendly, aggregate analytics to understand usage. It is configured to be
        cookieless and does not track you across other sites.</p>
      <h2>Managing cookies</h2>
      <p>You can clear or block cookies in your browser settings, but blocking essential cookies will
        prevent you from signing in. By continuing to use {APP} you consent to the essential cookies
        described here.</p>
      <h2>Contact</h2>
      <p>Questions about cookies: {CONTACT}.</p>
    </LegalLayout>
  );
}
