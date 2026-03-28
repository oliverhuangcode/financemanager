"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/server/api/routers/transaction";
import { api } from "@/trpc/react";

import { TransactionRow } from "./TransactionRow";

interface BankAccount {
  id: string;
  name: string;
}

interface TransactionsClientProps {
  accounts: BankAccount[];
}

export function TransactionsClient({ accounts }: TransactionsClientProps) {
  const [page, setPage] = useState(1);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();

  const resetPage = () => setPage(1);

  const { data, isLoading } = api.transaction.list.useQuery({
    page,
    accountId,
    dateFrom,
    dateTo,
    category,
  });

  const hasActiveFilter = !!(accountId ?? dateFrom ?? dateTo ?? category);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 p-4">
        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={accountId ?? ""}
          onChange={(e) => {
            setAccountId(e.target.value || undefined);
            resetPage();
          }}
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>From</span>
          <input
            type="date"
            className="rounded border px-2 py-1.5 text-sm"
            value={dateFrom ?? ""}
            onChange={(e) => {
              setDateFrom(e.target.value || undefined);
              resetPage();
            }}
          />
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>To</span>
          <input
            type="date"
            className="rounded border px-2 py-1.5 text-sm"
            value={dateTo ?? ""}
            onChange={(e) => {
              setDateTo(e.target.value || undefined);
              resetPage();
            }}
          />
        </div>

        <select
          className="rounded border px-2 py-1.5 text-sm"
          value={category ?? ""}
          onChange={(e) => {
            setCategory(e.target.value || undefined);
            resetPage();
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => {
              setAccountId(undefined);
              setDateFrom(undefined);
              setDateTo(undefined);
              setCategory(undefined);
              resetPage();
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <p className="py-8 text-center text-sm text-gray-500">
          Loading transactions...
        </p>
      )}

      {/* Empty state */}
      {!isLoading && data?.items.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          {hasActiveFilter
            ? "No transactions match the selected filters."
            : "No transactions yet. Connect your bank account and sync to get started."}
        </p>
      )}

      {/* Table */}
      {!isLoading && data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Account
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {data.pageCount} &mdash; {data.total} transactions
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pageCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
