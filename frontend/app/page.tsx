import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_ROLE, SESSION_TOKEN } from "@/lib/session";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN)?.value;
  const role = cookieStore.get(SESSION_ROLE)?.value;

  if (token && role === "admin") {
    redirect("/admin/quizzes");
  }
  if (token && role === "user") {
    redirect("/quizzes");
  }

  redirect("/login");
}
