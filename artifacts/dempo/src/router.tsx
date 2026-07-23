import { Switch, Route, Redirect } from "wouter";
import { useAuth, SignOutButton } from "@clerk/react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Loader2, MailQuestion } from "lucide-react";
import { Shell } from "@/components/layout";

function NotInvited() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-background">
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
        <MailQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-serif font-bold text-foreground mb-2">You're not on the list yet</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        Dempo Learn is invite-only. Ask your professor or administrator to add your email, then sign in again with that address.
      </p>
      <SignOutButton>
        <button className="px-4 py-2 rounded-md border font-medium text-muted-foreground hover:text-foreground">
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}

// Pages to import
import { LandingPage, SignInPage, SignUpPage, RolePickerPage } from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import CoursesPage from "@/pages/courses";
import CohortsPage from "@/pages/cohorts";
import JournalPage from "@/pages/journal";
import CourseViewPage from "@/pages/course-view";
import AssignmentViewPage from "@/pages/assignment-view";
import QuizViewPage from "@/pages/quiz-view";
import SubmissionViewPage from "@/pages/submission-view";
import MessagesPage from "@/pages/messages";
import CalendarPage from "@/pages/calendar";
import SettingsPage from "@/pages/settings";
import AdminLogsPage from "@/pages/admin-logs";
import AdminUsersPage from "@/pages/admin-users";
import AdminInvitesPage from "@/pages/admin-invites";
import OversightPage from "@/pages/oversight";
import CoordinatorPage from "@/pages/coordinator";
import FeedbackPage from "@/pages/feedback";
import AnalyticsPage from "@/pages/analytics";
import AnalyticsCoursePage from "@/pages/analytics-course";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading, isError, error } = useGetMe({ query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey(), retry: false } });

  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  // Invite-only: a signed-in account that isn't on the allow-list gets 403.
  if (isError) {
    const status = (error as any)?.response?.status ?? (error as any)?.status;
    if (status === 403) return <NotInvited />;
  }

  if (user && user.role === "unassigned" && rest.path !== "/role-picker") {
    return <Redirect to="/role-picker" />;
  }

  if (rest.adminOnly && user && !user.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  // Deans and coordinators have dedicated home pages instead of the
  // student/professor dashboard and course pages.
  if (user && rest.path === "/dashboard") {
    if (user.role === "dean") return <Redirect to="/oversight" />;
    if (user.role === "course_coordinator") return <Redirect to="/coordinator" />;
  }

  if (rest.roles && user && !rest.roles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

export function AppRouter() {
  return (
    <Shell>
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={LandingPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Auth Required Routes */}
        <Route path="/role-picker">
          <ProtectedRoute component={RolePickerPage} path="/role-picker" />
        </Route>
        
        {/* Dashboard */}
        <Route path="/dashboard">
          <ProtectedRoute component={DashboardPage} path="/dashboard" />
        </Route>

        {/* Dean & Course Coordinator */}
        <Route path="/oversight">
          <ProtectedRoute component={OversightPage} roles={["dean"]} />
        </Route>
        <Route path="/coordinator">
          <ProtectedRoute component={CoordinatorPage} roles={["course_coordinator"]} />
        </Route>
        <Route path="/feedback">
          <ProtectedRoute
            component={FeedbackPage}
            roles={["dean", "course_coordinator", "teacher"]}
          />
        </Route>
        <Route path="/analytics">
          <ProtectedRoute
            component={AnalyticsPage}
            roles={["teacher", "dean", "course_coordinator"]}
          />
        </Route>
        <Route path="/analytics/course/:id">
          {params => (
            <ProtectedRoute
              component={AnalyticsCoursePage}
              id={params.id}
              roles={["teacher", "dean", "course_coordinator"]}
            />
          )}
        </Route>

        {/* Courses */}
        <Route path="/courses">
          <ProtectedRoute component={CoursesPage} />
        </Route>
        <Route path="/cohorts">
          <ProtectedRoute component={CohortsPage} />
        </Route>
        <Route path="/journal">
          <ProtectedRoute component={JournalPage} />
        </Route>
        <Route path="/course/:id">
          {params => <ProtectedRoute component={CourseViewPage} id={params.id} />}
        </Route>

        {/* Assignments & Submissions */}
        <Route path="/assignment/:id">
          {params => <ProtectedRoute component={AssignmentViewPage} id={params.id} />}
        </Route>
        <Route path="/quiz/:id">
          {params => <ProtectedRoute component={QuizViewPage} id={params.id} />}
        </Route>
        <Route path="/submission/:id">
          {params => <ProtectedRoute component={SubmissionViewPage} id={params.id} />}
        </Route>

        {/* Calendar */}
        <Route path="/calendar">
          <ProtectedRoute component={CalendarPage} />
        </Route>

        {/* Messages */}
        <Route path="/messages">
          <ProtectedRoute component={MessagesPage} />
        </Route>

        {/* Admin */}
        <Route path="/admin/users">
          <ProtectedRoute component={AdminUsersPage} adminOnly />
        </Route>
        <Route path="/admin/invites">
          <ProtectedRoute component={AdminInvitesPage} adminOnly />
        </Route>
        <Route path="/admin/logs">
          <ProtectedRoute component={AdminLogsPage} adminOnly />
        </Route>

        {/* Settings */}
        <Route path="/settings">
          <ProtectedRoute component={SettingsPage} />
        </Route>

        {/* Catch-all */}
        <Route>
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <h1 className="text-6xl font-serif text-primary mb-4">404</h1>
            <h2 className="text-2xl font-medium text-foreground mb-2">Page not found</h2>
            <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
            <a href="/dashboard" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium">
              Go Home
            </a>
          </div>
        </Route>
      </Switch>
    </Shell>
  );
}
