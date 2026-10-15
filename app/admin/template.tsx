"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Admin template: ensures admin pages and their children cleanly dismount when navigating
 * between admin sections (e.g. /admin/orders -> /admin/products), while keeping the
 * AdminLayout (sidebar navigation, shell) mounted.
 */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="contents">
      {children}
    </div>
  );
}
