import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

import { AnalyticsClient } from "./_components/AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Analytics</h1>
      <AnalyticsClient />
    </main>
  );
}
