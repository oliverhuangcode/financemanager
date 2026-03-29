export const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transport",
  "Entertainment",
  "Bills & Utilities",
  "Health & Fitness",
  "Travel",
  "Income",
  "Transfer",
  "ATM & Cash",
  "Business",
  "Education",
  "Uncategorised",
] as const;

export type Category = (typeof CATEGORIES)[number];
