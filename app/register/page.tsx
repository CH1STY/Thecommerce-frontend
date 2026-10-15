import { Suspense } from "react";
import { Loading } from "@/components/common";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RegisterForm />
    </Suspense>
  );
}
