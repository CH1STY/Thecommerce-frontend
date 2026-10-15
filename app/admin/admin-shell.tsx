"use client";

import {
  BoxesIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PaletteIcon,
  ReceiptIcon,
  SettingsIcon,
  ShoppingBasketIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RequireRole } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export interface AdminSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin",
    label: "Overview",
    description: "Staff dashboard.",
    icon: LayoutDashboardIcon,
  },
  {
    href: "/admin/pos",
    label: "Point of sale",
    description: "Record a walk-in cash sale and print the receipt.",
    icon: ReceiptIcon,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    description:
      "All online and in-store orders; move orders through their status.",
    icon: ShoppingBasketIcon,
  },
  {
    href: "/admin/products",
    label: "Products",
    description:
      "Create and edit products, count stock, see each product's history.",
    icon: PackageIcon,
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    description: "Restock, returns, damaged/lost items and the stock ledger.",
    icon: BoxesIcon,
  },
  {
    href: "/admin/categories",
    label: "Categories",
    description: "Manage the category tree.",
    icon: FolderTreeIcon,
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Staff and customer accounts.",
    icon: UsersIcon,
    adminOnly: true,
  },
  {
    href: "/admin/storefront",
    label: "Storefront",
    description: "Design the home page and search results with drag and drop.",
    icon: PaletteIcon,
    adminOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Shop currency.",
    icon: SettingsIcon,
    adminOnly: true,
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const sections = ADMIN_SECTIONS.filter(
    (s) => !s.adminOnly || user?.role === "ADMIN",
  );
  return (
    <RequireRole roles={["ADMIN", "MANAGER"]}>
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav
          aria-label="Staff"
          className="no-print -mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-3 lg:sticky lg:top-20 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:border-0 lg:px-0 lg:pb-0"
        >
          {sections.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Button
                key={href}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "shrink-0 justify-start",
                  !active && "text-muted-foreground",
                )}
              >
                <Link href={href} aria-current={active ? "page" : undefined}>
                  <Icon data-icon="inline-start" />
                  {label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireRole>
  );
}
