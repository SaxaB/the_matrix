"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Settings,
  UserCircle,
  BookOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { signOutUser } from "@/lib/actions";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

const navigation = [
  { key: "nav.dashboard", href: "/dashboard", icon: BarChart3 },
  { key: "nav.diagnosis", href: "/perfil", icon: UserCircle },
  { key: "nav.portfolio", href: "/portfolio", icon: PieChart },
  { key: "nav.analysis", href: "/analysis", icon: TrendingUp },
  { key: "nav.explore", href: "/stocks", icon: Search },
  { key: "nav.howItWorks", href: "/como-funciona", icon: BookOpen },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await signOutUser();
    router.push("/");
    router.refresh();
  }

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Matrix</span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.key)}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            {user && (
              <div className="hidden items-center gap-1 md:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    title={t("nav.accountMenu")}
                  >
                    <span className="max-w-[140px] truncate">{displayName}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => router.push("/perfil")}
                        className="gap-2"
                      >
                        <UserIcon className="h-4 w-4" />
                        {t("nav.myProfile")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/ajustes")}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {t("nav.settings")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={handleLogout}
                        className="gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <div className="flex items-center md:hidden">
              <LanguageSwitcher />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.key)}
                </Link>
              );
            })}
            {user && (
              <div className="border-t pt-3">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors hover:bg-muted">
                    <span className="truncate">{displayName}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[min(100vw-2rem,16rem)]">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          router.push("/perfil");
                          setMobileOpen(false);
                        }}
                        className="gap-2"
                      >
                        <UserIcon className="h-4 w-4" />
                        {t("nav.myProfile")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          router.push("/ajustes");
                          setMobileOpen(false);
                        }}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {t("nav.settings")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setMobileOpen(false);
                          void handleLogout();
                        }}
                        className="gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
