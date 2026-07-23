import type { Metadata } from "next";
import { CompaniesClient } from "@/components/companies-client";

export const metadata: Metadata = {
  title: "For companies",
  description:
    "Sponsor a competition, post scoped paid projects, or hire from reviewed student portfolios. Every deliverable passes a personal review.",
};

export default function CompaniesPage() {
  return <CompaniesClient />;
}
