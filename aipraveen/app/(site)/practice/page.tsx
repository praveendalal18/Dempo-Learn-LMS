import type { Metadata } from "next";
import { PracticeClient } from "@/components/practice-client";

export const metadata: Metadata = {
  title: "Practice — 100 real projects",
  description:
    "100 real industry projects to AI-enable across marketing, finance, operations, HR, retail and education. Included free with any paid course.",
};

export default function PracticePage() {
  return <PracticeClient />;
}
