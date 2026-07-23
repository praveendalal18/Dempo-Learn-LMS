import type { Metadata } from "next";
import { WorkshopsClient } from "@/components/workshops-client";

export const metadata: Metadata = {
  title: "Workshops",
  description:
    "In-person AI build days for students across India — Mumbai, Pune, Bengaluru, Delhi NCR, Hyderabad, Goa. Arrive with an idea, leave with a deployed project.",
};

export default function WorkshopsPage() {
  return <WorkshopsClient />;
}
