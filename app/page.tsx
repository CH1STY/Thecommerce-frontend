import { Suspense } from "react";
import { Loading } from "@/components/common";
import { Storefront } from "./storefront";

export default function Home() {
  return (
    <Suspense fallback={<Loading label="Loading products…" />}>
      <Storefront />
    </Suspense>
  );
}
