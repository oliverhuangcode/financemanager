"use client";

import { api } from "@/trpc/react";

export function AccountsClient() {
  const utils = api.useUtils();
  const { data: accounts, isLoading } = api.account.list.useQuery();

  const connectMutation = api.basiq.createConsentUrl.useMutation({
    onSuccess: ({ consentUrl }) => {
      window.open(consentUrl, "_blank");
    },
  });

  const syncMutation = api.basiq.syncAccounts.useMutation({
    onSuccess: () => {
      void utils.account.list.invalidate();
    },
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="flex gap-3">
        <button
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {connectMutation.isPending ? "Connecting..." : "Connect bank account"}
        </button>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {syncMutation.isPending ? "Syncing..." : "Sync accounts"}
        </button>
      </div>

      {connectMutation.error && (
        <p className="text-sm text-red-600">{connectMutation.error.message}</p>
      )}
      {syncMutation.error && (
        <p className="text-sm text-red-600">{syncMutation.error.message}</p>
      )}

      {isLoading && (
        <p className="text-sm text-gray-500">Loading accounts...</p>
      )}

      {accounts && accounts.length === 0 && (
        <p className="text-sm text-gray-500">
          No accounts connected yet. Click &quot;Connect bank account&quot; to
          get started.
        </p>
      )}

      {accounts && accounts.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border">
          {accounts.map((acc) => (
            <li
              key={acc.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium">{acc.name}</p>
                <p className="text-sm capitalize text-gray-500">{acc.type}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {acc.currency} {Number(acc.balance).toFixed(2)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
