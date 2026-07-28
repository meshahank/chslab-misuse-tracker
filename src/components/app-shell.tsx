import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, ShieldAlert, BarChart3, Users, LogOut, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/punished", label: "Punished", icon: ShieldAlert },
    { to: "/statistics", label: "Statistics", icon: BarChart3 },
    ...(me?.isSuperAdmin ? [{ to: "/admins", label: "Admins", icon: Users }] : []),
  ];

  const initials = (me?.profile?.full_name ?? "?")
    .split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const currentLabel = nav.find((n) => pathname === n.to || pathname.startsWith(n.to + "/"))?.label ?? "Overview";

  return (
    <div className="relative flex min-h-screen">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/60 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.65_0.2_310)] text-primary-foreground elevated">
            <FlaskConical className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold text-sidebar-foreground">Lab Tracker</p>
            <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">Misuse registry</p>
          </div>
        </div>

        <div className="px-3">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
            Workspace
          </p>
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-3">
          <p className="text-[11px] font-medium text-sidebar-foreground/70">
            {me?.isSuperAdmin ? "Super Admin access" : "Lab Admin access"}
          </p>
          <p className="mt-0.5 text-[10px] text-sidebar-foreground/45">
            Signed in as @{me?.profile?.username}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-xl md:px-8">
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="font-display truncate text-[17px] font-semibold tracking-tight">
              {currentLabel}
            </h1>
            <span className="hidden sm:inline-flex h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_10px_currentColor]" />
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 pl-1.5 pr-3 rounded-full border border-transparent hover:border-border hover:bg-accent/40">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-[oklch(0.65_0.2_310)] text-[11px] font-semibold text-primary-foreground">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {me?.profile?.full_name ?? "Admin"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{me?.profile?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{me?.profile?.username} · {me?.isSuperAdmin ? "Super Admin" : "Lab Admin"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-30 flex border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
