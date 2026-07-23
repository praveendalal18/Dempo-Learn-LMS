import { MessageSquare, Trophy, Clock, CalendarDays, CheckCircle, GraduationCap, BookOpen, Loader2, ArrowRight, FileText } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { SignIn, SignUp, useAuth } from "@clerk/react";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* ---------------- Auth shell (sign in / sign up) ---------------- */

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-background py-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-md flex flex-col items-center">
        <Link href="/" className="flex flex-col items-center">
          <img src={import.meta.env.BASE_URL + "logo.png"} alt="Dempo Learn" className="w-11 h-11 mb-5" />
        </Link>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-center text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-8 mx-auto w-full max-w-md flex justify-center">
        {children}
      </div>
    </div>
  );
}

export function SignInPage() {
  return (
    <AuthShell title="Sign in to Dempo Learn" subtitle="Welcome back.">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </AuthShell>
  );
}

export function SignUpPage() {
  return (
    <AuthShell title="Create your account" subtitle="Set up your Dempo Learn profile.">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthShell>
  );
}

/* ---------------- Role picker ---------------- */

export function RolePickerPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();

  useEffect(() => {
    if (user && user.role !== "unassigned") setLocation("/dashboard");
  }, [user, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user.role !== "unassigned") return null;

  const handleSelectRole = (role: "student") => {
    updateMe.mutate({ data: { role } }, { onSuccess: () => setLocation("/dashboard") });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
      <div className="mx-auto w-full max-w-md flex flex-col items-center text-center">
        <img src={import.meta.env.BASE_URL + "logo.png"} alt="Dempo Learn" className="w-12 h-12 mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Welcome to Dempo Learn</h1>
        <p className="text-muted-foreground max-w-sm mb-10">
          Let's set you up as a student — join courses, submit work, and track your grades and feedback.
        </p>
        <Card className="w-full text-left">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
              <BookOpen className="w-5 h-5 text-foreground" />
            </div>
            <CardTitle className="text-lg">Continue as student</CardTitle>
            <CardDescription>Join courses, submit assignments, and view grades and feedback.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled={updateMe.isPending} className="w-full" onClick={() => handleSelectRole("student")}>
              {updateMe.isPending ? "Setting up…" : "Get started"}
            </Button>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground mt-6">
          Teaching on Dempo? Your administrator will set up your educator account.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Landing ---------------- */

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Faster grading, better feedback",
    body: "AI drafts grades and comments; professors review and approve. Less time marking, quicker feedback for students.",
  },
  {
    icon: FileText,
    title: "Submit in any format",
    body: "Text, files, links, or a recorded video or voice note — captured right in the browser, tracked in one place.",
  },
  {
    icon: MessageSquare,
    title: "Conversations, not lost emails",
    body: "Message your professor where the work lives. Questions and feedback stay attached to the course.",
  },
];

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/dashboard");
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || isSignedIn) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={import.meta.env.BASE_URL + "logo.png"} alt="Dempo Learn" className="w-7 h-7 rounded-md" />
            <span className="font-semibold text-[15px]">Dempo Learn</span>
          </div>
          <Button asChild size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 pt-20 pb-16 text-center">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            Dempo AI Business School
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Everything your class needs, in one calm place.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Course plans, assignments, feedback, and grades — organized so students and professors can focus on the work, not the tooling.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">Sign in <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Invite-only. Ask your professor or administrator for access.</p>
        </div>
      </section>

      {/* Product preview */}
      <section className="mx-auto max-w-5xl px-5 md:px-8 pb-20">
        <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/50">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/25" />
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/25" />
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/25" />
            <div className="ml-3 flex-1 max-w-xs h-6 rounded-md bg-background border text-[11px] text-muted-foreground flex items-center px-3">
              dempolearn.app/dashboard
            </div>
          </div>
          <div className="p-6 sm:p-8 space-y-6 text-left">
            <div>
              <div className="text-xl font-semibold tracking-tight">Welcome back, Maya</div>
              <div className="text-sm text-muted-foreground">Here's your overview for today.</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Overall score", value: "92%" },
                { label: "Courses", value: "3" },
                { label: "Due soon", value: "2" },
                { label: "Class rank", value: "#2" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                  <div className="text-2xl font-semibold tracking-tight mt-0.5">{stat.value}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border">
                <div className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" /> Recent submissions
                </div>
                <div className="divide-y">
                  {[
                    { title: "Case Study: Market Entry", score: "18/20" },
                    { title: "Presentation Recording", score: "9/10" },
                    { title: "Weekly Reflection #6", score: null },
                  ].map((sub) => (
                    <div key={sub.title} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{sub.title}</div>
                      {sub.score ? (
                        <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded shrink-0">{sub.score}</span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">Awaiting grade</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border">
                  <div className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> Due soon
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-medium">Negotiation Roleplay Video</div>
                    <span className="text-[11px] text-muted-foreground font-medium">Thu, 5:00 PM</span>
                  </div>
                </div>
                <div className="rounded-lg border">
                  <div className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" /> Leaderboard
                  </div>
                  <div className="divide-y">
                    {[
                      { rank: 1, name: "J. Okafor", score: "95%", me: false },
                      { rank: 2, name: "You", score: "92%", me: true },
                      { rank: 3, name: "L. Chen", score: "89%", me: false },
                    ].map((e) => (
                      <div key={e.rank} className={`px-4 py-2 flex items-center gap-3 ${e.me ? "bg-muted/60" : ""}`}>
                        <span className="w-5 text-xs font-semibold text-muted-foreground">#{e.rank}</span>
                        <span className={`text-sm flex-1 ${e.me ? "font-semibold" : "font-medium"}`}>{e.name}</span>
                        <span className="text-sm font-semibold">{e.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border px-4 py-3 flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">Next class:</span>
                  <span className="text-muted-foreground truncate">Wed 10:00 AM · Room 204</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-20">
          <div className="max-w-xl mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">Built for how classes actually run</h2>
            <p className="mt-3 text-muted-foreground">
              A focused set of tools that stay out of the way — for a single professor or a whole department.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={import.meta.env.BASE_URL + "logo.png"} alt="" className="w-5 h-5 rounded" />
            <span>Dempo Learn</span>
          </div>
          <span>Dempo AI Business School · Goa</span>
        </div>
      </footer>
    </div>
  );
}
