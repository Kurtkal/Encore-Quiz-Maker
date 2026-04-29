import type { ReactNode } from "react";

export function Alert({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">{children}</div>;
}
