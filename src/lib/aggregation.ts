/**
 * Shared rules for turning stored transactions into spending and income totals.
 */

export interface CategorisedTx {
  userCategory: string | null;
  basiqCategory: string | null;
}

/** The user's override wins over Basiq's category. */
export function effectiveCategory(tx: CategorisedTx): string {
  return tx.userCategory ?? tx.basiqCategory ?? "Uncategorised";
}

/**
 * Money moved between the user's own accounts (e.g. ANZ → ubank) shows up as a
 * debit on one account and a credit on the other. It is neither spending nor
 * income, so totals skip anything whose effective category is "Transfer".
 *
 * Basiq marks transfers via `class: "transfer"`. Imported CSV/PDF rows start as
 * "Uncategorised", so recategorise them as Transfer to exclude them.
 */
export function isInternalTransfer(tx: CategorisedTx): boolean {
  return effectiveCategory(tx) === "Transfer";
}

/** Transactions that count towards spending/income totals. */
export function countable<T extends CategorisedTx>(txs: T[]): T[] {
  return txs.filter((tx) => !isInternalTransfer(tx));
}
