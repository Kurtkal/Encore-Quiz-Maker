import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";

export default function RegisterPage() {
  return (
    <div className="grid gap-4">
      <AuthForm mode="register" />
      <p className="text-center text-sm text-muted">
        Already registered?{" "}
        <Link className="font-semibold text-teal" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
