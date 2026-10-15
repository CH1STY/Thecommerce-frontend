import { AdminShell } from "./admin-shell";

export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
