const BASIQ_BASE = "https://au-api.basiq.io";

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
