"use client";

import { LockIcon, ShieldAlertIcon, StoreIcon } from "lucide-react";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState, Loading } from "@/components/common";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider, useSession } from "@/lib/session";
import { SettingsProvider } from "@/lib/settings";
import type { Role } from "@/lib/types";
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

export const Header = SiteHeader;

/** Storefront pages built from full-width sections lay out their own containers. */
const FULL_WIDTH = ["/", "/search"];
const WIDE = ["/admin/storefront"];

export function Main({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const full = FULL_WIDTH.includes(pathname);
  const wide = WIDE.includes(pathname);
  return (
    <main
      className={cn(
        "w-full flex-1",
        !full && "mx-auto px-4 py-8",
        !full && (wide ? "max-w-[100rem]" : "max-w-6xl"),
      )}
    >
      {children}
    </main>
  );
}

export function Footer() {
  const { user } = useSession();
  const columns = [
    {
      title: "Shop",
      links: [
        { href: "/search", label: "All products" },
        { href: "/search?sort=NEWEST", label: "New arrivals" },
        { href: "/search?inStock=true", label: "In stock now" },
        { href: "/search?sort=PRICE_ASC", label: "Best value" },
      ],
    },
    {
      title: "Your account",
      links: user
        ? [
            { href: "/account", label: "My profile" },
            ...(user.role === "CUSTOMER"
              ? [{ href: "/account/orders", label: "My orders" }]
              : [{ href: "/admin", label: "Staff area" }]),
            { href: "/cart", label: "Cart" },
          ]
        : [
            { href: "/login", label: "Sign in" },
            { href: "/register", label: "Create an account" },
            { href: "/cart", label: "Cart" },
          ],
    },
  ];
  return (
    <footer className="no-print mt-12 border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <StoreIcon className="size-4" />
            </span>
            TheCommerce
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse freely, then sign in or check out as a guest — your order history follows your phone number.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="space-y-3">
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground">TheCommerce</p>
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
