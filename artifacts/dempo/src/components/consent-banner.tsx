import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const KEY = "dempo.consent.v1";

// A minimal cookie/consent notice. The app only sets essential (auth) cookies
// and uses cookieless analytics, so this is a notice + acknowledgement rather
// than a full opt-in/opt-out manager.
export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked — skip the banner */
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-xl border bg-card shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          We use only essential cookies to sign you in, plus privacy-friendly, cookieless analytics.
          See our{" "}
          <Link href="/legal/cookies" className="text-info hover:underline">Cookie Notice</Link>{" "}and{" "}
          <Link href="/legal/privacy" className="text-info hover:underline">Privacy Policy</Link>.
        </p>
        <Button size="sm" onClick={accept} className="shrink-0 w-full sm:w-auto">Got it</Button>
      </div>
    </div>
  );
}
