import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="grid gap-4">
      <AuthForm mode="login" />
      <p className="text-center text-sm text-muted">
        Need an account?{" "}
        <Link className="font-semibold text-teal" href="/register">
          Register
        </Link>
      </p>
    </div>
  );
}
