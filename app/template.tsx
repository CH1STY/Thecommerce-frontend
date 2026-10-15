"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Root template: wraps each page route segment to ensure clean component dismounting/remounting
 * on navigation, while preserving persistent layouts (RootLayout, Header, Footer, Providers).
 * Admin subroutes are handled by app/admin/template.tsx so AdminLayout remains mounted.
 */
export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageKey = pathname.startsWith("/admin") ? "admin-root" : pathname;
  return (
    <div key={pageKey} className="contents">
      {children}
    </div>
  );
}
