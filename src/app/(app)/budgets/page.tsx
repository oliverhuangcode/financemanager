import { BudgetsClient } from "./_components/BudgetsClient";

export default function BudgetsPage() {
  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Budgets</h1>
      <BudgetsClient />
    </main>
  );
}
