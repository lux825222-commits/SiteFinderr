import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppShell,
});

function AppShell() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur md:px-6">
            <SidebarTrigger />
            <div className="md:hidden">
              <Logo withText className="h-7 w-7" />
            </div>
            <span className="ml-auto hidden text-xs text-muted-foreground md:inline">
              Prospecção de empresas que precisam de um site profissional
            </span>
          </header>
          <main className="relative flex-1 bg-gradient-hero px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
