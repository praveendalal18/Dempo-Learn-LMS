import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { SignOutButton, useAuth } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, BookOpen, GraduationCap, LayoutDashboard, Settings, MessageSquare, Menu, ScrollText, Users as UsersIcon, CalendarDays, NotebookPen, Mail } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Shell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading } = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });
  const [location] = useLocation();

  // Signed-out visitors get public pages (landing, sign-in, sign-up) with no chrome.
  if (!isLoaded || !isSignedIn) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-16 border-b bg-card flex items-center px-6 animate-pulse">
          <div className="w-8 h-8 rounded-md bg-muted"></div>
        </div>
        <div className="flex-1 p-8">
          <div className="w-full max-w-4xl mx-auto h-[600px] rounded-xl bg-card border animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Shell handles unassigned / public routes loosely, but mostly used for authenticated users
  if (!user || user.role === "unassigned") {
    return <>{children}</>;
  }

  const isTeacher = user.role === "teacher";
  const isDean = user.role === "dean";
  const isCoordinator = user.role === "course_coordinator";

  const adminNav = user.isAdmin
    ? [
        { name: "Invites", href: "/admin/invites", icon: Mail },
        { name: "Users", href: "/admin/users", icon: UsersIcon },
        { name: "Admin Logs", href: "/admin/logs", icon: ScrollText },
      ]
    : [];

  const navigation = isDean
    ? [
        { name: "Oversight", href: "/oversight", icon: LayoutDashboard },
        { name: "Feedback", href: "/feedback", icon: MessageSquare },
        { name: "Settings", href: "/settings", icon: Settings },
        ...adminNav,
      ]
    : isCoordinator
      ? [
          { name: "Courses", href: "/coordinator", icon: BookOpen },
          { name: "Feedback", href: "/feedback", icon: MessageSquare },
          { name: "Settings", href: "/settings", icon: Settings },
          ...adminNav,
        ]
      : [
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { name: "Courses", href: "/courses", icon: BookOpen },
          { name: "Journal", href: "/journal", icon: NotebookPen },
          ...(isTeacher ? [{ name: "Cohorts", href: "/cohorts", icon: UsersIcon }] : []),
          ...(isTeacher ? [{ name: "Feedback", href: "/feedback", icon: MessageSquare }] : []),
          { name: "Calendar", href: "/calendar", icon: CalendarDays },
          { name: "Messages", href: "/messages", icon: MessageSquare },
          { name: "Settings", href: "/settings", icon: Settings },
          ...adminNav,
        ];

  const roleLabel =
    user.role === "teacher"
      ? "Professor"
      : user.role === "dean"
        ? "Dean"
        : user.role === "course_coordinator"
          ? "Course Coordinator"
          : user.role;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <img src={import.meta.env.BASE_URL + "logo.png"} alt="Dempo Learn Logo" className="w-8 h-8" />
          <span className="font-serif font-semibold text-lg">Dempo Learn</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full bg-card">
              <div className="p-4 border-b flex items-center gap-2">
                <img src={import.meta.env.BASE_URL + "logo.png"} alt="Dempo Learn" className="w-6 h-6" />
                <span className="font-serif font-semibold">Dempo Learn</span>
              </div>
              <div className="flex-1 py-4 overflow-y-auto">
                <nav className="space-y-0.5 px-2">
                  {navigation.map((item) => {
                    const active = location.startsWith(item.href) || (location === '/' && item.href === '/dashboard');
                    return (
                      <Link key={item.name} href={item.href} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'}`}>
                        <item.icon className={`w-4 h-4 shrink-0 ${active ? '' : 'text-muted-foreground'}`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <div className="p-4 border-t">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={user.avatarUrl || ''} />
                    <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                </div>
                <div className="mb-2">
                  <ThemeToggle />
                </div>
                <SignOutButton>
                  <Button variant="outline" className="w-full justify-start text-muted-foreground" size="sm">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </SignOutButton>
              </div>
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-screen sticky top-0 shrink-0">
        <div className="h-14 flex items-center gap-2 px-4">
          <img src={import.meta.env.BASE_URL + "logo.png"} alt="Dempo Learn Logo" className="w-7 h-7 rounded-md" />
          <span className="font-semibold text-[15px] text-foreground">Dempo Learn</span>
          <div className="ml-auto -mr-1">
            <NotificationBell />
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border mb-6">
            <Avatar className="w-10 h-10 border bg-background">
              <AvatarImage src={user.avatarUrl || ''} />
              <AvatarFallback className="text-primary font-medium bg-primary/10">{user.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate leading-tight">{user.name}</span>
              <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                {isTeacher || isDean || isCoordinator ? <GraduationCap className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                {roleLabel}
              </span>
            </div>
          </div>
          
          <nav className="space-y-0.5">
            {navigation.map((item) => {
              const active = location.startsWith(item.href) || (location === '/' && item.href === '/dashboard');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? '' : 'text-muted-foreground'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t space-y-1">
          <ThemeToggle />
          <SignOutButton>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" size="sm">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </SignOutButton>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
