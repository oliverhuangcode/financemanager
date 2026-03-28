import { DashboardClient } from "./_components/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <DashboardClient />
    </main>
  );
}
