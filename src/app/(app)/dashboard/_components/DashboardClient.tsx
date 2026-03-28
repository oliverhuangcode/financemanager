"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

function SyncButton() {
  const utils = api.useUtils();
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncTxMutation = api.basiq.syncTransactions.useMutation({
    onSuccess: () => {
      setSyncError(null);
      void utils.dashboard.summary.invalidate();
      void utils.account.list.invalidate();
    },
    onError: (err) => setSyncError(err.message),
  });

  const syncAccountsMutation = api.basiq.syncAccounts.useMutation({
    onSuccess: () => syncTxMutation.mutate(),
    onError: (err) => setSyncError(err.message),
  });

  const isPending = syncAccountsMutation.isPending ?? syncTxMutation.isPending;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => {
          setSyncError(null);
          syncAccountsMutation.mutate();
        }}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending && (
          <svg
            className="h-4 w-4 animate-spin text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {isPending ? "Syncing..." : "Sync Now"}
      </button>
      {syncError && (
        <p className="text-sm text-red-600">{syncError}</p>
      )}
    </div>
  );
}

function currentMonthYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatCurrency(amount: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(amount);
}

export function DashboardClient() {
  const [monthYear, setMonthYear] = useState(currentMonthYear);

  const { data, isLoading } = api.dashboard.summary.useQuery({ monthYear });

  const [yearStr, monthStr] = monthYear.split("-");
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    1,
  ).toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Month selector + Sync */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <input
            type="month"
            className="rounded border px-3 py-1.5 text-sm"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            max={currentMonthYear()}
          />
          <span className="text-sm text-gray-500">{monthLabel}</span>
        </div>
        <SyncButton />
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-gray-500">
          Loading dashboard...
        </p>
      )}

      {data && (
        <>
          {/* Row 1: Total spend + Account balances */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatCurrency(data.totalSpent)}
                </p>
                <p className="mt-1 text-sm text-gray-500">{monthLabel}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Balances</CardTitle>
              </CardHeader>
              <CardContent>
                {data.accountBalances.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No accounts connected.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.accountBalances.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-700">{acc.name}</span>
                        <span className="font-medium">
                          {formatCurrency(acc.balance, acc.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Top categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top Spending Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCategories.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No spending data for {monthLabel}.
                </p>
              ) : (
                <ol className="space-y-3">
                  {data.topCategories.map(({ category, amount }, i) => (
                    <li key={category} className="flex items-center gap-3">
                      <span className="w-5 text-right text-sm font-medium text-gray-400">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span className="font-medium">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        {data.totalSpent > 0 && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{
                                width: `${Math.min(100, (amount / data.totalSpent) * 100).toFixed(1)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Row 3: Recent transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-500">No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                          Date
                        </th>
                        <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                          Description
                        </th>
                        <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">
                          Amount
                        </th>
                        <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                          Account
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0">
                          <td className="py-2 text-sm whitespace-nowrap text-gray-500">
                            {new Date(tx.date).toLocaleDateString("en-AU", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td className="max-w-[200px] truncate py-2 text-sm">
                            {tx.description}
                          </td>
                          <td
                            className={`py-2 text-right text-sm font-medium whitespace-nowrap ${
                              tx.isCredit ? "text-green-600" : "text-gray-900"
                            }`}
                          >
                            {tx.isCredit ? "+" : "-"}
                            {formatCurrency(
                              Math.abs(tx.amount),
                              tx.currency ?? "AUD",
                            )}
                          </td>
                          <td className="py-2 text-sm whitespace-nowrap text-gray-500">
                            {tx.account.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
