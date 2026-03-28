"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings/accounts", label: "Accounts" },
];

interface AppNavProps {
  userEmail?: string | null;
  signOutAction: () => Promise<void>;
}

export function AppNav({ userEmail, signOutAction }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
        <span className="mr-4 text-sm font-semibold text-gray-900">
          Finance Manager
        </span>

        <div className="flex flex-wrap items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-gray-400 sm:block">
              {userEmail}
            </span>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
