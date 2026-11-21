import { type PrismaClient } from "@prisma/client";

import { type BasiqTransaction, mapBasiqTransaction } from "./basiqMapping";

/**
 * Upsert Basiq transactions into the DB for a given BankAccount (by our internal accountId).
 *
 * Idempotency rules:
 * - Keyed on basiqTxId (Basiq's unique transaction ID)
 * - Pending transactions are skipped (see mapBasiqTransaction)
 * - On update: refreshes description, amount, direction and basiqCategory,
 *   so a re-sync corrects rows stored by older code
 * - userCategory is NEVER included in the update block — user overrides persist forever
 *
 * Returns the number of posted transactions written.
 */
export async function upsertTransactions(
  db: PrismaClient,
  accountId: string,
  transactions: BasiqTransaction[],
): Promise<number> {
  let upserted = 0;

  for (const raw of transactions) {
    const tx = mapBasiqTransaction(raw);
    if (!tx) continue;

    await db.transaction.upsert({
      where: { basiqTxId: tx.basiqTxId },
      create: {
        accountId,
        basiqTxId: tx.basiqTxId,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency,
        basiqCategory: tx.basiqCategory,
        isCredit: tx.isCredit,
        // userCategory intentionally omitted — defaults to null
      },
      update: {
        // Mutable fields that Basiq may update (enrichment, corrections)
        description: tx.description,
        amount: tx.amount,
        isCredit: tx.isCredit,
        basiqCategory: tx.basiqCategory,
        // userCategory intentionally absent — never overwrite user's override
      },
    });
    upserted++;
  }

  return upserted;
}
