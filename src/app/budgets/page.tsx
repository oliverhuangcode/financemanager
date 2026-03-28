import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

import { BudgetsClient } from "./_components/BudgetsClient";

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Budgets</h1>
      <BudgetsClient />
    </main>
  );
}
