"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { ADMIN_SECTIONS } from "./admin-shell";

export function AdminHome() {
  const { user } = useSession();
  const { settings } = useSettings();
  return (
    <div>
      <PageHeader
        title="Staff dashboard"
        description={`Signed in as ${user?.fullName ?? "staff"}. Prices are shown in ${settings.currency}.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {ADMIN_SECTIONS.filter(
          (s) => s.href !== "/admin" && (!s.adminOnly || user?.role === "ADMIN"),
        ).map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md group-hover:ring-foreground/20">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="flex items-center gap-1">
                  {label}
                  <ArrowRightIcon className="size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
