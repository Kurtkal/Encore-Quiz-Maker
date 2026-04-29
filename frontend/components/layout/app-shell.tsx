"use client";

import { BookOpenCheck, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearSession, readSession, type Session } from "@/lib/session";
import { cn } from "@/lib/utils";

const links = {
  admin: [{ href: "/admin/quizzes", label: "Admin", icon: LayoutDashboard }],
  user: [{ href: "/quizzes", label: "Quizzes", icon: BookOpenCheck }],
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    setSessionState(readSession());
  }, [pathname]);

  function logout() {
    clearSession();
    setSessionState(null);
    router.push("/login");
  }

  const navLinks = session ? links[session.role] : [];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-ink">
            <BookOpenCheck className="h-5 w-5 text-teal" aria-hidden="true" />
            Quiz System
          </Link>
          <nav className="flex items-center gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-canvas hover:text-ink",
                    active && "bg-canvas text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            {session ? (
              <Button variant="ghost" icon={<LogOut className="h-4 w-4" aria-hidden="true" />} onClick={logout}>
                Sign out
              </Button>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
