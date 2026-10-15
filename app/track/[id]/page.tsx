"use client";

import { Suspense, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/common";

function RedirectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/orders/${id}`);
  }, [id, router]);

  return <Loading label="Redirecting to order tracking..." />;
}

export default function TrackIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Loading label="Redirecting..." />}>
      <RedirectContent params={params} />
    </Suspense>
  );
}
