import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/common";
import { SearchPage } from "./search-page";

export const metadata: Metadata = { title: "Search · TheCommerce Store" };

export default function Search() {
  return (
    <Suspense fallback={<Loading label="Loading products…" />}>
      <SearchPage />
    </Suspense>
  );
}
