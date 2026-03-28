import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import {
  getBasiqAccounts,
  getBasiqTransactions,
  getServerToken,
} from "@/lib/basiq";
import { upsertTransactions } from "@/lib/upsertTransactions";
import { db } from "@/server/db";

/**
 * Verify Basiq HMAC-SHA256 signature.
 * Basiq signs the raw request body with the webhook secret and sends the hex
 * digest in the x-basiq-signature header.
 * Uses constant-time comparison to prevent timing attacks.
 */
function verifySignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    // Buffer.from throws if signature is not valid hex — treat as invalid
    return false;
  }
}

interface WebhookPayload {
  id: string;
  payload: {
    eventTypeId: string;
    eventId: string;
    links: {
      event: string;
      eventEntity: string;
    };
  };
}

/**
 * Extract the Basiq userId from an eventEntity URL.
 * e.g. "https://au-api.basiq.io/users/abc123/connections/xyz" → "abc123"
 */
function extractBasiqUserId(entityUrl: string): string | null {
  const match = /\/users\/([^/]+)/.exec(entityUrl);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  // 1. Read raw body as Buffer — must happen before any JSON parsing
  const rawBody = Buffer.from(await req.arrayBuffer());

  // 2. Verify HMAC signature when secret is configured
  if (env.BASIQ_WEBHOOK_SECRET) {
    const signature = req.headers.get("x-basiq-signature") ?? "";
    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-basiq-signature header" },
        { status: 401 },
      );
    }
    if (!verifySignature(rawBody, signature, env.BASIQ_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // 3. Parse payload
  let body: WebhookPayload;
  try {
    body = JSON.parse(rawBody.toString("utf-8")) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventTypeId, links } = body.payload;

  // 4. Handle transaction/account update events
  if (
    eventTypeId === "connector.data.updated" ||
    eventTypeId === "account.updated"
  ) {
    const basiqUserId = extractBasiqUserId(links.eventEntity);
    if (!basiqUserId) {
      console.error(
        "[webhook] Could not extract basiqUserId from:",
        links.eventEntity,
      );
      return NextResponse.json({ received: true });
    }

    const connection = await db.basiqConnection.findUnique({
      where: { basiqUserId },
      include: { bankAccounts: true },
    });

    if (!connection) {
      // Unknown user — not our concern, acknowledge and move on
      return NextResponse.json({ received: true });
    }

    try {
      const token = await getServerToken(env.BASIQ_API_KEY);

      // Refresh account balances
      const basiqAccounts = await getBasiqAccounts(token, basiqUserId);
      await Promise.all(
        basiqAccounts.map((acc) =>
          db.bankAccount.updateMany({
            where: {
              basiqAccountId: acc.id,
              connectionId: connection.id,
            },
            data: { balance: acc.balance },
          }),
        ),
      );

      // Fetch and upsert transactions per account
      let totalUpserted = 0;
      for (const bankAccount of connection.bankAccounts) {
        const txs = await getBasiqTransactions(
          token,
          basiqUserId,
          bankAccount.basiqAccountId,
        );
        const count = await upsertTransactions(db, bankAccount.id, txs);
        totalUpserted += count;
      }

      console.log(
        `[webhook] ${eventTypeId}: synced ${totalUpserted} transactions for basiq user ${basiqUserId}`,
      );
    } catch (err) {
      // Log error but always return 200 — prevents Basiq retry storms
      console.error("[webhook] Sync error:", err);
    }
  }

  // 5. Acknowledge all events with 200
  return NextResponse.json({ received: true });
}
