const BASIQ_BASE = "https://au-api.basiq.io";

export interface BasiqWebhook {
  id: string;
  type: string;
  name: string;
  description?: string;
  url: string;
  status: string;
  secret?: string;
  links: { self: string };
}

/**
 * Register a new webhook endpoint with Basiq.
 * Returns the created webhook including the one-time signing secret.
 */
export async function createWebhook(
  token: string,
  appUrl: string,
): Promise<BasiqWebhook> {
  const res = await fetch(`${BASIQ_BASE}/notifications/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "FinanceManager",
      description: "Realtime transaction sync",
      url: `${appUrl}/api/webhooks/basiq`,
      subscribedEvents: [
        "transactions.updated",
        "account.updated",
        "connection.invalidated",
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq createWebhook error ${res.status}: ${text}`);
  }

  return (await res.json()) as BasiqWebhook;
}

/**
 * List all registered webhooks for this application.
 */
export async function listWebhooks(token: string): Promise<BasiqWebhook[]> {
  const res = await fetch(`${BASIQ_BASE}/notifications/webhooks`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq listWebhooks error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { data: BasiqWebhook[] };
  return data.data ?? [];
}

export interface BasiqAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  class: { type: string; product: string };
  status: string;
}

/**
 * Fetch a SERVER_ACCESS token from Basiq.
 * Uses HTTP Basic auth: base64(apiKey + ":") per Basiq v3 docs.
 */
export async function getServerToken(apiKey: string): Promise<string> {
  const credentials = Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(`${BASIQ_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "basiq-version": "3.0",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=SERVER_ACCESS",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Create a Basiq user entity. Returns the Basiq userId string.
 */
export async function createBasiqUser(
  token: string,
  email: string,
): Promise<string> {
  const res = await fetch(`${BASIQ_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq createUser error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Create an auth link for a Basiq user. Returns the public consent URL.
 */
export async function createAuthLink(
  token: string,
  basiqUserId: string,
): Promise<string> {
  const res = await fetch(`${BASIQ_BASE}/users/${basiqUserId}/auth_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq createAuthLink error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    links: { public: string };
  };
  return data.links.public;
}

/**
 * Fetch all accounts for a Basiq user.
 */
export async function getBasiqAccounts(
  token: string,
  basiqUserId: string,
): Promise<BasiqAccount[]> {
  const res = await fetch(`${BASIQ_BASE}/users/${basiqUserId}/accounts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq getAccounts error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { data: BasiqAccount[] };
  return data.data ?? [];
}

export interface BasiqTransaction {
  id: string;
  description: string;
  amount: string;
  currency: string;
  postDate: string | null;
  transactionDate: string | null;
  transactionType: "debit" | "credit";
  enrich?: {
    category?: string;
  };
}

/**
 * Fetch transactions for a specific account from Basiq.
 * Filters by account ID and fetches up to 500 most recent transactions.
 */
export async function getBasiqTransactions(
  token: string,
  basiqUserId: string,
  basiqAccountId: string,
): Promise<BasiqTransaction[]> {
  const filter = `account.id.eq('${basiqAccountId}')`;
  const url = `${BASIQ_BASE}/users/${basiqUserId}/transactions?filter=${encodeURIComponent(filter)}&limit=500`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq getTransactions error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { data: BasiqTransaction[] };
  return data.data ?? [];
}

/**
 * Delete a registered webhook by ID.
 */
export async function deleteWebhook(
  token: string,
  webhookId: string,
): Promise<void> {
  const res = await fetch(
    `${BASIQ_BASE}/notifications/webhooks/${webhookId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "basiq-version": "3.0",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq deleteWebhook error ${res.status}: ${text}`);
  }
  // 204 No Content — nothing to return
}

/**
 * Send a test webhook message for a given event type.
 * Basiq will deliver the test event to all registered webhooks.
 */
export async function sendTestWebhook(
  token: string,
  eventTypeId: string,
): Promise<void> {
  const res = await fetch(`${BASIQ_BASE}/notifications/messages/test`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "basiq-version": "3.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ eventTypeId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq sendTestWebhook error ${res.status}: ${text}`);
  }
}
