"use client";

import {
  LayoutDashboard,
  FileText,
  Radio,
  Calendar,
  BarChart3,
  ImageIcon,
  CreditCard,
  Settings,
  LogOut,
  ChevronsUpDown,
  MessageSquare,
  Link2,
  Shield,
} from "lucide-react";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/server/actions/auth";

type NavItemKey =
  | "dashboard"
  | "create"
  | "posts"
  | "channels"
  | "telegramPost"
  | "schedule"
  | "analytics"
  | "media"
  | "billing"
  | "settings"
  | "admin";

type NavItem = {
  key: NavItemKey;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  muted?: boolean;
  adminOnly?: boolean;
};

const primaryNavItems: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { key: "telegramPost", icon: MessageSquare, href: "/dashboard/telegram-post" },
  { key: "create", icon: Link2, href: "/dashboard/create" },
  { key: "posts", icon: FileText, href: "/dashboard/posts" },
  { key: "schedule", icon: Calendar, href: "/dashboard/schedule" },
  { key: "channels", icon: Radio, href: "/dashboard/channels" },
];

const secondaryNavItems: NavItem[] = [
  { key: "analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { key: "media", icon: ImageIcon, href: "/dashboard/media" },
  { key: "billing", icon: CreditCard, href: "/dashboard/billing" },
  { key: "admin", icon: Shield, href: "/dashboard/admin", adminOnly: true },
  { key: "settings", icon: Settings, href: "/dashboard/settings" },
];

type AppSidebarProps = {
  userEmail?: string | null;
  isAdmin?: boolean;
};

function NavItemsList({
  items,
  t,
  isAdmin,
}: {
  items: NavItem[];
  t: (key: NavItemKey) => string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {items
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const isActive =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);

          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={t(item.key)}
                className={cn(item.muted && !isActive && "text-muted-foreground opacity-70")}
              >
                <Link href={item.href}>
                  <item.icon className={cn("size-4")} />
                  <span>{t(item.key)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
    </SidebarMenu>
  );
}

export function AppSidebar({ userEmail, isAdmin = false }: AppSidebarProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "U";

  return (
    <Sidebar data-tour="sidebar-nav">
      <SidebarHeader className="border-sidebar-border border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Radio className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm leading-none font-semibold">Content OS</span>
            <span className="text-muted-foreground text-xs">Telegram</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("dashboard")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItemsList items={primaryNavItems} t={t} isAdmin={isAdmin} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <NavItemsList items={secondaryNavItems} t={t} isAdmin={isAdmin} />
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto">
          <OnboardingChecklist />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userEmail ?? "User"}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 size-4" />
                    {t("settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form>
                    <button
                      formAction={logout}
                      className="text-destructive flex w-full items-center gap-2"
                    >
                      <LogOut className="size-4" />
                      {tAuth("logout")}
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
