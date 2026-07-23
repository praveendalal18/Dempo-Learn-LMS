import type { Metadata } from "next";
import { StoreClient } from "@/components/store-client";

export const metadata: Metadata = {
  title: "Store — courses and kits",
  description:
    "Self-paced AI video courses and starter kits. Every purchase includes one year of full on-platform access. UPI, cards, netbanking via Razorpay.",
};

export default function StorePage() {
  return <StoreClient />;
}
