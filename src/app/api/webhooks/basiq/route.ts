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
 * Verify Basiq webhook signature using their Svix-based scheme.
 *
 * Basiq sends three headers:
 *   webhook-id        — unique ID for this delivery attempt
 *   webhook-timestamp — seconds since epoch when the attempt was made
 *   webhook-signature — space-delimited list of "v1,<base64>" signatures
 *
 * The signed content is: "{webhook-id}.{webhook-timestamp}.{raw-body}"
 * The HMAC key is the base64-decoded portion of the secret after "whsec_".
 *
 * Replay attack protection: reject if timestamp is >5 minutes from now.
 */
function verifyBasiqSignature(
  rawBody: Buffer,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string,
): boolean {
  // 1. Replay attack guard — reject if >5 minutes from now
  const ts = parseInt(webhookTimestamp, 10);
  if (isNaN(ts)) return false;
  const diffSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (diffSeconds > 300) return false;

  // 2. Derive the HMAC key — strip "whsec_" prefix, then base64-decode
  const secretBase64 = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  const keyBytes = Buffer.from(secretBase64, "base64");

  // 3. Build the signed content
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody.toString("utf-8")}`;

  // 4. Compute expected signature (base64)
  const expected = crypto
    .createHmac("sha256", keyBytes)
    .update(signedContent)
    .digest("base64");

  // 5. webhook-signature is a space-delimited list of "v1,<base64>" entries
  //    Accept if ANY entry matches (supports key rotation)
  const signatures = webhookSignature.split(" ");
  for (const entry of signatures) {
    const sig = entry.startsWith("v1,") ? entry.slice(3) : entry;
    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(expected, "base64"),
          Buffer.from(sig, "base64"),
        )
      ) {
        return true;
      }
    } catch {
      // Invalid base64 in one entry — keep checking others
    }
  }

  return false;
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

  // 2. Verify signature when secret is configured
  if (env.BASIQ_WEBHOOK_SECRET) {
    const webhookId = req.headers.get("webhook-id") ?? "";
    const webhookTimestamp = req.headers.get("webhook-timestamp") ?? "";
    const webhookSignature = req.headers.get("webhook-signature") ?? "";

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return NextResponse.json(
        { error: "Missing webhook-id, webhook-timestamp, or webhook-signature headers" },
        { status: 401 },
      );
    }

    if (
      !verifyBasiqSignature(
        rawBody,
        webhookId,
        webhookTimestamp,
        webhookSignature,
        env.BASIQ_WEBHOOK_SECRET,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
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

  // 4. Handle relevant events:
  //    transactions.updated — new transactions added for a user
  //    account.updated      — account details changed (balance, name, etc.)
  //    connection.invalidated — auth issue (password changed, MFA required)
  if (
    eventTypeId === "transactions.updated" ||
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

  if (eventTypeId === "connection.invalidated") {
    // Auth issue — log it. Future: notify user via email or flag in UI.
    const basiqUserId = extractBasiqUserId(links.eventEntity);
    console.warn(
      `[webhook] connection.invalidated for basiq user ${basiqUserId ?? "unknown"} — user may need to re-authenticate`,
    );
  }

  // 5. Always acknowledge with 200 — prevents Basiq retry storms
  return NextResponse.json({ received: true });
}
