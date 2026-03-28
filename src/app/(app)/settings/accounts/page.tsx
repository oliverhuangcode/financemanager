import { AccountsClient } from "./_components/AccountsClient";

export default function AccountSettingsPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Connected Accounts</h1>
      <p className="mt-1 text-sm text-gray-500">
        Connect your ANZ bank accounts via Basiq to start importing transactions.
      </p>
      <AccountsClient />
    </main>
  );
}
