"use client";

import { useState } from "react";

import { api } from "@/trpc/react";

export function AccountsClient() {
  const utils = api.useUtils();
  const { data: accounts, isLoading } = api.account.list.useQuery();
  const { data: webhooks, isLoading: webhooksLoading } =
    api.basiq.webhookStatus.useQuery();

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

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

  const registerWebhookMutation = api.basiq.registerWebhook.useMutation({
    onSuccess: (webhook) => {
      void utils.basiq.webhookStatus.invalidate();
      if (webhook.secret) setRevealedSecret(webhook.secret);
    },
  });

  const deleteWebhookMutation = api.basiq.deleteWebhook.useMutation({
    onSuccess: () => {
      void utils.basiq.webhookStatus.invalidate();
    },
  });

  const testWebhookMutation = api.basiq.testWebhook.useMutation({
    onSuccess: () => {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    },
  });

  const hasWebhook = webhooks && webhooks.length > 0;

  return (
    <div className="mt-6 space-y-8">
      {/* ── Bank accounts ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Bank Accounts</h2>

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
              <li key={acc.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{acc.name}</p>
                  <p className="text-sm capitalize text-gray-500">{acc.type}</p>
                </div>
                <p className="font-medium">
                  {acc.currency} {Number(acc.balance).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Webhooks ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Realtime Sync (Webhooks)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Register your app with Basiq so transactions sync automatically when
            ANZ posts new activity. Requires a Basiq plan that supports webhooks.
          </p>
        </div>

        {webhooksLoading && (
          <p className="text-sm text-gray-500">Checking webhook status...</p>
        )}

        {/* Existing webhooks */}
        {!webhooksLoading && hasWebhook && (
          <ul className="divide-y divide-gray-200 rounded-lg border">
            {webhooks.map((wh) => (
              <li key={wh.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{wh.url}</p>
                  <p className="mt-0.5 text-xs text-gray-400">ID: {wh.id}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      wh.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {wh.status}
                  </span>
                  <button
                    onClick={() => deleteWebhookMutation.mutate({ webhookId: wh.id })}
                    disabled={deleteWebhookMutation.isPending}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleteWebhookMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {deleteWebhookMutation.error && (
          <p className="text-sm text-red-600">{deleteWebhookMutation.error.message}</p>
        )}

        {!webhooksLoading && !hasWebhook && (
          <p className="text-sm text-gray-500">No webhooks registered yet.</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!hasWebhook && (
            <button
              onClick={() =>
                registerWebhookMutation.mutate({
                  appUrl: window.location.origin,
                })
              }
              disabled={registerWebhookMutation.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {registerWebhookMutation.isPending ? "Registering..." : "Register Webhook"}
            </button>
          )}

          {hasWebhook && (
            <button
              onClick={() => testWebhookMutation.mutate()}
              disabled={testWebhookMutation.isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {testWebhookMutation.isPending ? "Sending..." : "Send Test Event"}
            </button>
          )}
        </div>

        {registerWebhookMutation.error && (
          <p className="text-sm text-red-600">{registerWebhookMutation.error.message}</p>
        )}
        {testWebhookMutation.error && (
          <p className="text-sm text-red-600">{testWebhookMutation.error.message}</p>
        )}
        {testSent && (
          <p className="text-sm text-green-600">
            Test event sent — check your webhook logs to confirm delivery.
          </p>
        )}

        {/* One-time secret reveal */}
        {revealedSecret && (
          <div className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-800">
              Save this secret — it will not be shown again
            </p>
            <code className="block break-all rounded bg-yellow-100 px-3 py-2 font-mono text-xs text-yellow-900">
              BASIQ_WEBHOOK_SECRET={revealedSecret}
            </code>
            <ol className="list-inside list-decimal space-y-1 text-xs text-yellow-700">
              <li>Add this to your <strong>.env</strong> file locally</li>
              <li>Add it to <strong>Vercel → Settings → Environment Variables</strong></li>
              <li>Redeploy for it to take effect</li>
            </ol>
            <button
              onClick={() => setRevealedSecret(null)}
              className="text-xs text-yellow-600 underline hover:text-yellow-800"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
