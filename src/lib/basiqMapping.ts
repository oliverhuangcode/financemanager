import { type Category } from "./categories";

/**
 * Shape of a Basiq v3 transaction, limited to the fields this app reads.
 * See https://api.basiq.io/reference/transactions
 *
 * - `amount` is a signed decimal string ("-39.50" for a debit).
 * - `direction` is "debit" or "credit" (there is no `transactionType` field).
 * - `status` is "pending" or "posted". Pending transactions are replaced by a
 *   posted transaction with a different id once they settle.
 * - `class` describes the transaction type, e.g. "payment", "transfer",
 *   "cash-withdrawal", "bank-fee", "interest", "refund".
 * - `enrich` is null unless the Basiq app has Enrich enabled. When present,
 *   `enrich.category` is an ANZSIC object, not a string.
 */
export interface BasiqTransaction {
  id: string;
  description: string;
  amount: string;
  currency?: string;
  status?: "pending" | "posted" | string;
  direction: "debit" | "credit" | string;
  class?: string | null;
  postDate: string | null;
  transactionDate: string | null;
  enrich?: {
    category?: {
      anzsic?: {
        division?: AnzsicLevel | null;
        subdivision?: AnzsicLevel | null;
        group?: AnzsicLevel | null;
        class?: AnzsicLevel | null;
      } | null;
    } | null;
  } | null;
}

interface AnzsicLevel {
  code?: string;
  title?: string;
}

export interface MappedTransaction {
  basiqTxId: string;
  date: Date;
  description: string;
  /** Unsigned decimal string, e.g. "39.50" — direction lives in isCredit. */
  amount: string;
  currency: string;
  isCredit: boolean;
  basiqCategory: Category;
}

/** Strip the sign from a decimal string without going through floats. */
export function unsignedAmount(amount: string): string {
  return amount.trim().replace(/^[-+]/, "");
}

/**
 * Map a Basiq transaction onto one of the app's 13 categories.
 *
 * Order matters: the transaction class decides transfers, cash and fees first,
 * then credits become Income, and only debits fall through to ANZSIC codes.
 */
export function mapBasiqCategory(tx: BasiqTransaction): Category {
  const cls = (tx.class ?? "").toLowerCase();

  if (cls === "transfer") return "Transfer";
  if (cls === "cash-withdrawal") return "ATM & Cash";
  if (cls === "bank-fee") return "Bills & Utilities";

  if (tx.direction === "credit") return "Income";

  const anzsic = tx.enrich?.category?.anzsic;
  const division = anzsic?.division?.code?.toUpperCase();
  const subdivision = anzsic?.subdivision?.code;
  const group = anzsic?.group?.code;

  // Specific groups first
  if (group === "411") return "Food & Dining"; // Supermarket and grocery stores
  if (group === "400") return "Transport"; // Fuel retailing
  if (group === "722") return "Travel"; // Travel agency and tour arrangement
  if (group === "911") return "Health & Fitness"; // Sports and physical recreation

  // Subdivisions
  if (subdivision === "44") return "Travel"; // Accommodation
  if (subdivision === "45") return "Food & Dining"; // Food and beverage services
  if (subdivision === "49") return "Travel"; // Air and space transport
  if (subdivision === "58") return "Bills & Utilities"; // Telecommunications

  switch (division) {
    case "G": // Retail trade
      return "Shopping";
    case "I": // Transport, postal and warehousing
      return "Transport";
    case "R": // Arts and recreation services
      return "Entertainment";
    case "Q": // Health care and social assistance
      return "Health & Fitness";
    case "D": // Electricity, gas, water and waste services
    case "K": // Financial and insurance services
      return "Bills & Utilities";
    case "P": // Education and training
      return "Education";
    case "M": // Professional, scientific and technical services
    case "N": // Administrative and support services
      return "Business";
    default:
      return "Uncategorised";
  }
}

/**
 * Convert a Basiq transaction to the fields stored in the Transaction table.
 * Returns null for pending transactions: Basiq replaces them with a posted
 * transaction under a new id, so storing them would double-count spend.
 */
export function mapBasiqTransaction(
  tx: BasiqTransaction,
): MappedTransaction | null {
  if (tx.status === "pending") return null;

  const dateStr = tx.postDate ?? tx.transactionDate;
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  return {
    basiqTxId: tx.id,
    date,
    description: tx.description,
    amount: unsignedAmount(tx.amount),
    currency: tx.currency ?? "AUD",
    isCredit: tx.direction === "credit",
    basiqCategory: mapBasiqCategory(tx),
  };
}
