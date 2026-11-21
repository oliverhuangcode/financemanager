import { describe, expect, it } from "vitest";

import { countable, effectiveCategory, isInternalTransfer } from "./aggregation";

describe("effectiveCategory", () => {
  it("prefers the user's override", () => {
    expect(
      effectiveCategory({ userCategory: "Travel", basiqCategory: "Shopping" }),
    ).toBe("Travel");
    expect(
      effectiveCategory({ userCategory: null, basiqCategory: null }),
    ).toBe("Uncategorised");
  });
});

describe("transfer exclusion", () => {
  it("drops both legs of an own-account transfer", () => {
    const txs = [
      { userCategory: null, basiqCategory: "Transfer", amount: 1000 }, // ANZ debit
      { userCategory: null, basiqCategory: "Transfer", amount: 1000 }, // ubank credit
      { userCategory: null, basiqCategory: "Food & Dining", amount: 20 },
    ];
    expect(countable(txs).map((t) => t.amount)).toEqual([20]);
  });

  it("respects a manual recategorisation to Transfer", () => {
    expect(
      isInternalTransfer({ userCategory: "Transfer", basiqCategory: "Uncategorised" }),
    ).toBe(true);
  });

  it("lets a user un-mark a transfer", () => {
    expect(
      isInternalTransfer({ userCategory: "Income", basiqCategory: "Transfer" }),
    ).toBe(false);
  });
});
