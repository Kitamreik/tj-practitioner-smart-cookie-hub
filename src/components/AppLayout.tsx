import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { activeSemester } = useSemester();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Badge variant="outline" className="text-xs font-normal">
                {activeSemester.name}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user?.name} <span className="capitalize">({user?.role})</span>
              </span>
              <ThemeToggle />
              <NotificationPanel />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
