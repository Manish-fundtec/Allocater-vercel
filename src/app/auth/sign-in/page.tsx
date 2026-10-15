import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1a1448] text-white">
          Loading...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
