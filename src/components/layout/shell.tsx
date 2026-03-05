import { AppSidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type ShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  isAdmin?: boolean;
};

export function Shell({ children, userEmail, isAdmin = false }: ShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar userEmail={userEmail} isAdmin={isAdmin} />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
