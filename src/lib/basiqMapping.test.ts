import { describe, expect, it } from "vitest";

import {
  type BasiqTransaction,
  mapBasiqCategory,
  mapBasiqTransaction,
  unsignedAmount,
} from "./basiqMapping";

function tx(over: Partial<BasiqTransaction> = {}): BasiqTransaction {
  return {
    id: "t1",
    description: "WOOLWORTHS 1234",
    amount: "-39.50",
    currency: "AUD",
    status: "posted",
    direction: "debit",
    class: "payment",
    postDate: "2026-03-01T00:00:00Z",
    transactionDate: null,
    enrich: null,
    ...over,
  };
}

const anzsic = (division: string, subdivision?: string, group?: string) => ({
  category: {
    anzsic: {
      division: { code: division },
      subdivision: subdivision ? { code: subdivision } : null,
      group: group ? { code: group } : null,
    },
  },
});

describe("unsignedAmount", () => {
  it("strips the sign without float maths", () => {
    expect(unsignedAmount("-39.50")).toBe("39.50");
    expect(unsignedAmount("+0.10")).toBe("0.10");
    expect(unsignedAmount("1234567.89")).toBe("1234567.89");
  });
});

describe("mapBasiqTransaction", () => {
  it("reads direction (not transactionType) for credits", () => {
    const m = mapBasiqTransaction(
      tx({ direction: "credit", amount: "2000.00", class: "payment" }),
    );
    expect(m?.isCredit).toBe(true);
    expect(m?.amount).toBe("2000.00");
    expect(m?.basiqCategory).toBe("Income");
  });

  it("stores debits as unsigned amounts", () => {
    const m = mapBasiqTransaction(tx());
    expect(m?.isCredit).toBe(false);
    expect(m?.amount).toBe("39.50");
  });

  it("skips pending transactions", () => {
    expect(mapBasiqTransaction(tx({ status: "pending" }))).toBeNull();
  });

  it("skips transactions with no usable date", () => {
    expect(
      mapBasiqTransaction(tx({ postDate: null, transactionDate: null })),
    ).toBeNull();
  });

  it("falls back to transactionDate", () => {
    const m = mapBasiqTransaction(
      tx({ postDate: null, transactionDate: "2026-03-02T00:00:00Z" }),
    );
    expect(m?.date.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });

  it("never passes the enrich object through as a category", () => {
    const m = mapBasiqTransaction(tx({ enrich: anzsic("G", "41", "411") }));
    expect(typeof m?.basiqCategory).toBe("string");
  });
});

describe("mapBasiqCategory", () => {
  it.each([
    [{ class: "transfer", direction: "debit" }, "Transfer"],
    [{ class: "transfer", direction: "credit" }, "Transfer"],
    [{ class: "cash-withdrawal" }, "ATM & Cash"],
    [{ class: "bank-fee" }, "Bills & Utilities"],
    [{ direction: "credit", class: "interest" }, "Income"],
    [{ enrich: anzsic("G", "41", "411") }, "Food & Dining"],
    [{ enrich: anzsic("H", "45", "451") }, "Food & Dining"],
    [{ enrich: anzsic("G", "40", "400") }, "Transport"],
    [{ enrich: anzsic("G", "42", "425") }, "Shopping"],
    [{ enrich: anzsic("I", "46") }, "Transport"],
    [{ enrich: anzsic("I", "49") }, "Travel"],
    [{ enrich: anzsic("H", "44") }, "Travel"],
    [{ enrich: anzsic("R", "91", "911") }, "Health & Fitness"],
    [{ enrich: anzsic("R", "90") }, "Entertainment"],
    [{ enrich: anzsic("J", "58") }, "Bills & Utilities"],
    [{ enrich: anzsic("P") }, "Education"],
    [{ enrich: anzsic("M") }, "Business"],
    [{ enrich: null }, "Uncategorised"],
    [{ enrich: anzsic("Z") }, "Uncategorised"],
  ] as const)("%j -> %s", (over, expected) => {
    expect(mapBasiqCategory(tx(over as Partial<BasiqTransaction>))).toBe(
      expected,
    );
  });
});
