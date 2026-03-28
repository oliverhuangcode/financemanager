import { type PrismaClient } from "@prisma/client";

import { type BasiqTransaction } from "./basiq";

/**
 * Upsert Basiq transactions into the DB for a given BankAccount (by our internal accountId).
 *
 * Idempotency rules:
 * - Keyed on basiqTxId (Basiq's unique transaction ID)
 * - Creates new transactions with basiqCategory from Basiq (or "Uncategorised")
 * - On update: refreshes description, amount, basiqCategory
 * - userCategory is NEVER included in the update block — user overrides persist forever
 */
export async function upsertTransactions(
  db: PrismaClient,
  accountId: string,
  transactions: BasiqTransaction[],
): Promise<number> {
  let upserted = 0;

  for (const tx of transactions) {
    const date = new Date(
      tx.postDate ?? tx.transactionDate ?? new Date().toISOString(),
    );
    const isCredit = tx.transactionType === "credit";
    const basiqCategory = tx.enrich?.category ?? "Uncategorised";

    await db.transaction.upsert({
      where: { basiqTxId: tx.id },
      create: {
        accountId,
        basiqTxId: tx.id,
        date,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency ?? "AUD",
        basiqCategory,
        isCredit,
        // userCategory intentionally omitted — defaults to null
      },
      update: {
        // Mutable fields that Basiq may update (enrichment, corrections)
        description: tx.description,
        amount: tx.amount,
        basiqCategory,
        // userCategory intentionally absent — never overwrite user's override
      },
    });
    upserted++;
  }

  return upserted;
}
