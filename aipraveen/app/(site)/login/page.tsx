import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/login-client";

export const metadata: Metadata = {
  title: "Log in",
  description: "Passwordless login — we email you a magic link that works for 15 minutes.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
