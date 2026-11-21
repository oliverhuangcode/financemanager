import { describe, expect, it } from "vitest";

import { readEvent } from "./basiqWebhook";

describe("readEvent", () => {
  it("reads Basiq's flat body", () => {
    expect(
      readEvent({
        eventTypeId: "transactions.updated",
        eventId: "e1",
        links: {
          event: "https://au-api.basiq.io/events/e1",
          eventEntity: "https://au-api.basiq.io/users/u1/transactions",
        },
      }),
    ).toEqual({
      eventTypeId: "transactions.updated",
      eventEntity: "https://au-api.basiq.io/users/u1/transactions",
    });
  });

  it("still reads the nested payload shape", () => {
    expect(
      readEvent({
        payload: {
          eventTypeId: "account.updated",
          links: { eventEntity: "https://au-api.basiq.io/users/u2" },
        },
      }),
    ).toEqual({
      eventTypeId: "account.updated",
      eventEntity: "https://au-api.basiq.io/users/u2",
    });
  });

  it("returns undefined instead of throwing on an unknown shape", () => {
    expect(readEvent({})).toEqual({ eventTypeId: undefined, eventEntity: undefined });
  });
});
