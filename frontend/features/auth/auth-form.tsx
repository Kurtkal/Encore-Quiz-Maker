"use client";

import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { setSession } from "@/lib/session";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password, role });
      setSession(response.token, response.user);
      router.push(response.user.role === "admin" ? "/admin/quizzes" : "/quizzes");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="mx-auto max-w-md rounded-md border border-line bg-white p-6 shadow-soft">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">{isRegister ? "Create account" : "Sign in"}</h1>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        {error ? <Alert>{error}</Alert> : null}
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <div className="grid gap-1.5">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-teal"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            {showPassword ? "Hide password" : "Show password"}
          </button>
        </div>

        {isRegister ? (
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            <span>Role</span>
            <select
              className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        ) : null}

        <Button
          type="submit"
          disabled={submitting}
          icon={isRegister ? <UserPlus className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
        >
          {submitting ? "Working..." : isRegister ? "Register" : "Login"}
        </Button>
      </form>
    </div>
  );
}
