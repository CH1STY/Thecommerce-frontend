import { Suspense } from "react";
import { Loading } from "@/components/common";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  );
}
