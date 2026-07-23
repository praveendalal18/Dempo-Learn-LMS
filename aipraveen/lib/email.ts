/**
 * Transactional email. In dev (no MSG91 env) it logs to the server console so
 * magic links are visible without a mail provider. In prod it sends via MSG91
 * (India), keeping delivery data in-region for DPDP.
 */
const MSG91_ENABLED =
  !!process.env.MSG91_AUTHKEY && process.env.MSG91_EMAIL_ENABLED === "true";

interface SendArgs {
  to: string;
  subject: string;
  /** Plain-text body for the dev console log. */
  text: string;
  /** Optional MSG91 template id + variables for production. */
  templateId?: string;
  variables?: Record<string, string>;
}

export async function sendEmail(args: SendArgs): Promise<void> {
  if (!MSG91_ENABLED) {
    // Dev fallback: make the content (and magic links) visible in the terminal.
    console.log(
      `\n──────── ✉  EMAIL (dev) ────────\nTo:      ${args.to}\nSubject: ${args.subject}\n\n${args.text}\n────────────────────────────────\n`,
    );
    return;
  }

  // Production: MSG91 v5 template email API.
  const res = await fetch("https://control.msg91.com/api/v5/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: process.env.MSG91_AUTHKEY as string,
    },
    body: JSON.stringify({
      to: [{ email: args.to }],
      from: {
        email: process.env.MSG91_FROM_EMAIL ?? "hello@aipraveen.com",
        name: "Praveen Dalal",
      },
      domain: process.env.MSG91_EMAIL_DOMAIN,
      template_id: args.templateId,
      variables: args.variables,
    }),
  });
  if (!res.ok) {
    console.error("MSG91 email failed", res.status, await res.text());
  }
}

export async function sendMagicLink(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your login link (works for 15 minutes)",
    text: `Sign in with one click:\n\n${url}\n\nLink expires in 15 minutes. If this wasn't you, ignore this email.`,
    templateId: process.env.MSG91_TEMPLATE_MAGIC_LINK,
    variables: { url },
  });
}
