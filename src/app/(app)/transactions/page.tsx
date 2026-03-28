import { auth } from "@/server/auth";
import { db } from "@/server/db";

import { TransactionsClient } from "./_components/TransactionsClient";

export default async function TransactionsPage() {
  const session = (await auth())!;

  const connections = await db.basiqConnection.findMany({
    where: { userId: session.user.id },
    select: {
      bankAccounts: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const accounts = connections.flatMap((c) => c.bankAccounts);

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Transactions</h1>
      <TransactionsClient accounts={accounts} />
    </main>
  );
}
