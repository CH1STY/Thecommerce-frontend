import { Suspense } from "react";
import { Loading } from "@/components/common";
import { Inventory } from "./inventory";

export default function InventoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Inventory />
    </Suspense>
  );
}
