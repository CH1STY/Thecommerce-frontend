"use client";

import {
  LayoutDashboardIcon,
  LockIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PackageIcon,
  ShieldAlertIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  StoreIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EmptyState, Loading } from "@/components/common";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCart } from "@/lib/cart";
import { humanize, initials } from "@/lib/format";
import { SessionProvider, useSession } from "@/lib/session";
import { SettingsProvider } from "@/lib/settings";
import { isStaff, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <SettingsProvider>
          <SessionProvider>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </SessionProvider>
        </SettingsProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(!active && "text-muted-foreground")}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        {children}
      </Link>
    </Button>
  );
}

export function Header() {
  const { user, logout } = useSession();
  const lines = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  async function signOut() {
    await logout();
    router.push("/");
  }

  const links = [
    { href: "/", label: "Shop", show: true },
    {
      href: "/account/orders",
      label: "My orders",
      show: user?.role === "CUSTOMER",
    },
    { href: "/admin", label: "Staff area", show: !!user && isStaff(user) },
  ].filter((l) => l.show);

  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-3 sm:gap-2 sm:px-4">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Open menu"
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>TheCommerce</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {links.map((l) => (
                <Button
                  key={l.href}
                  asChild
                  variant="ghost"
                  className="justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  <Link href={l.href}>{l.label}</Link>
                </Button>
              ))}
              {user === null && (
                <Button
                  asChild
                  variant="ghost"
                  className="justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="mr-auto flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <StoreIcon className="size-4" />
          </span>
          TheCommerce
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <ThemeToggle />

        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
        >
          <Link href="/cart">
            <ShoppingCartIcon />
            {count > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] tabular-nums">
                {count}
              </Badge>
            )}
          </Link>
        </Button>

        {user === undefined ? (
          <div className="size-8" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Account menu"
              >
                <Avatar size="sm">
                  <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate font-medium text-foreground">
                  {user.fullName}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email} · {humanize(user.role)}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <UserIcon />
                    My profile
                  </Link>
                </DropdownMenuItem>
                {user.role === "CUSTOMER" && (
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <PackageIcon />
                      My orders
                    </Link>
                  </DropdownMenuItem>
                )}
                {isStaff(user) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <LayoutDashboardIcon />
                      Staff area
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/cart">
                    <ShoppingBagIcon />
                    Cart
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => void signOut()}
              >
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="no-print border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
        <span>TheCommerce</span>
        <span>Browse freely · sign in or check out as a guest</span>
      </div>
    </footer>
  );
}

/** UI-only guard; the backend enforces the same rules (401/403). */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user } = useSession();
  if (user === undefined) return <Loading />;
  if (user === null) {
    return (
      <EmptyState
        icon={LockIcon}
        title="Sign in required"
        description="Please sign in to continue."
      >
        <SignInLink />
      </EmptyState>
    );
  }
  if (!roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        title="No access"
        description="You don't have permission to view this page."
      >
        <Button asChild variant="outline">
          <Link href="/">Back to the shop</Link>
        </Button>
      </EmptyState>
    );
  }
  return <>{children}</>;
}

function SignInLink() {
  const next =
    typeof window === "undefined"
      ? "/"
      : window.location.pathname + window.location.search;
  return (
    <Button asChild>
      <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
    </Button>
  );
}
