"use client";

import {
  BoxesIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PaletteIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ReceiptIcon,
  SettingsIcon,
  ShoppingBasketIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireRole } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const COLLAPSED_KEY = "tc-admin-nav-collapsed";
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    collapsedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Storage may be unavailable (private mode); the toggle still works for this page view.
  }
  collapsedListeners.forEach((listener) => listener());
}

/** Desktop sidebar state, remembered across visits. */
function useNavCollapsed() {
  return useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
}

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const collapsed = useNavCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = ADMIN_SECTIONS.filter(
    (s) => !s.adminOnly || user?.role === "ADMIN",
  );
  const current = sections.find((s) => isActive(pathname, s.href));

  return (
    <div data-admin-shell className="w-full">
      <RequireRole roles={["ADMIN", "MANAGER"]}>
        <div className="flex items-start gap-6">
          <aside
            className={cn(
              "no-print sticky top-[7.25rem] hidden max-h-[calc(100vh-8.5rem)] shrink-0 flex-col gap-1 overflow-y-auto overflow-x-hidden scroll-smooth border-r pr-3 transition-[width] duration-200 lg:flex",
              collapsed ? "w-[3.75rem]" : "w-56",
            )}
          >
            <div
              className={cn(
                "mb-1 flex items-center",
                collapsed ? "justify-center" : "justify-between pl-2.5",
              )}
            >
              {!collapsed && (
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Staff area
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                    aria-expanded={!collapsed}
                    onClick={() => writeCollapsed(!collapsed)}
                  >
                    {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {collapsed ? "Expand menu" : "Collapse menu"}
                </TooltipContent>
              </Tooltip>
            </div>
            <nav aria-label="Staff" className="flex flex-col gap-1">
              {sections.map((section) => (
                <NavItem
                  key={section.href}
                  section={section}
                  active={current?.href === section.href}
                  collapsed={collapsed}
                />
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="no-print mb-4 flex items-center gap-2 border-b pb-3 lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <PanelLeftOpenIcon data-icon="inline-start" />
                    Staff menu
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-72 gap-0 overflow-y-auto scroll-smooth"
                >
                  <SheetHeader>
                    <SheetTitle>Staff area</SheetTitle>
                  </SheetHeader>
                  <nav aria-label="Staff" className="flex flex-col gap-1 px-3 pb-4">
                    {sections.map((section) => (
                      <NavItem
                        key={section.href}
                        section={section}
                        active={current?.href === section.href}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
              {current && (
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <current.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{current.label}</span>
                </span>
              )}
            </div>
            {children}
          </div>
        </div>
      </RequireRole>
    </div>
  );
}

function NavItem({
  section: { href, label, icon: Icon },
  active,
  collapsed = false,
  onNavigate,
}: {
  section: AdminSection;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      size={collapsed ? "icon" : "default"}
      className={cn(
        collapsed ? "mx-auto" : "w-full justify-start",
        !active && "text-muted-foreground",
      )}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        onClick={onNavigate}
      >
        <Icon data-icon={collapsed ? undefined : "inline-start"} />
        {!collapsed && label}
      </Link>
    </Button>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
