import { describe, expect, it } from "vitest";

import { isEmailAllowed } from "./allowlist";

describe("isEmailAllowed", () => {
  const list = "oliver@example.com, Other@Example.com";

  it("matches case-insensitively and trims", () => {
    expect(isEmailAllowed(" OLIVER@example.com ", list, "production")).toBe(true);
    expect(isEmailAllowed("other@example.com", list, "production")).toBe(true);
  });

  it("rejects anyone not listed", () => {
    expect(isEmailAllowed("stranger@gmail.com", list, "production")).toBe(false);
    expect(isEmailAllowed(null, list, "production")).toBe(false);
  });

  it("fails closed in production when the list is empty", () => {
    expect(isEmailAllowed("oliver@example.com", "", "production")).toBe(false);
    expect(isEmailAllowed("oliver@example.com", undefined, "production")).toBe(false);
  });

  it("allows anyone in development when no list is set", () => {
    expect(isEmailAllowed("anyone@gmail.com", undefined, "development")).toBe(true);
  });
});
