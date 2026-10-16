import { Suspense } from "react";
import { Loading } from "@/components/common";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
