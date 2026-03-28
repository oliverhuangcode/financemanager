import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

import { DashboardClient } from "./_components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <DashboardClient />
    </main>
  );
}
