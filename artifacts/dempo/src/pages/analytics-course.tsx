import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/page";
import { Button } from "@/components/ui/button";
import { AnalyticsPanel } from "@/components/analytics-panel";

// Standalone course-analytics view for Dean / Coordinator drill-down from the
// program page. Reuses AnalyticsPanel (which only needs the analytics API, so
// it works for any course they're allowed to analyze — not just ones they own).
export default function AnalyticsCoursePage({ id }: { id: string }) {
  const courseId = parseInt(id, 10);
  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground">
        <Link href="/analytics"><ArrowLeft className="w-4 h-4 mr-2" /> Back to analytics</Link>
      </Button>
      <AnalyticsPanel courseId={courseId} />
    </PageContainer>
  );
}
