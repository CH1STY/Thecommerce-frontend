"use client";

import { RequireRole } from "@/components/shell";
import { StorefrontDesigner } from "./designer";

export default function StorefrontPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <StorefrontDesigner />
    </RequireRole>
  );
}
