"use client";

import { SectionList, SectionsSkeleton } from "@/components/storefront/sections";
import { usePageLayout } from "@/lib/use-page-layout";

export function HomePage() {
  const { sections, preview, selectedId } = usePageLayout("home");
  if (!sections) return <SectionsSkeleton />;
  return (
    <div className="pb-4">
      <SectionList sections={sections} preview={preview} selectedId={selectedId} />
    </div>
  );
}
