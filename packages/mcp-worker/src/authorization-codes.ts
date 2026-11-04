interface CodeRecord {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: number;
}

const CODE_TTL_MS = 600_000;

// Each object owns one of 256 hash prefixes. Guessed codes cannot create an
// unbounded number of persistent objects, and the full hash never leaves the
// Worker's private binding.
export class AuthorizationCodes {
  private readonly storage: DurableObjectStorage;

  constructor(private readonly state: DurableObjectState) {
    this.storage = state.storage;
    this.storage.sql.exec(`CREATE TABLE IF NOT EXISTS codes (
      hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, redirect_uri TEXT NOT NULL,
      challenge TEXT NOT NULL, expires_at INTEGER NOT NULL
    )`);
  }

  async fetch(request: Request): Promise<Response> {
    const body = await request.json() as {
      hash: string; clientId?: string; redirectUri?: string; codeChallenge?: string;
    };
    if (!/^[a-f0-9]{64}$/.test(body.hash)) return new Response(null, { status: 400 });
    const path = new URL(request.url).pathname;
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (path === "/create") {
      if (!body.clientId || !body.redirectUri || !body.codeChallenge) return new Response(null, { status: 400 });
      await this.state.blockConcurrencyWhile(async () => {
        const expires = Date.now() + CODE_TTL_MS;
        const existingAlarm = await this.storage.getAlarm();
        if (existingAlarm === null || existingAlarm > expires) await this.storage.setAlarm(expires);
        this.storage.sql.exec(
          "INSERT INTO codes (hash, client_id, redirect_uri, challenge, expires_at) VALUES (?, ?, ?, ?, ?)",
          body.hash, body.clientId!, body.redirectUri!, body.codeChallenge!, expires,
        );
      });
      return new Response(null, { status: 201 });
    }
    if (path === "/consume") {
      const row = this.storage.sql.exec<{
        client_id: string; redirect_uri: string; challenge: string; expires_at: number;
      }>("DELETE FROM codes WHERE hash = ? RETURNING client_id, redirect_uri, challenge, expires_at", body.hash)
        .toArray()[0];
      if (!row || row.expires_at <= Date.now()) return new Response(null, { status: 404 });
      const result: CodeRecord = { clientId: row.client_id, redirectUri: row.redirect_uri,
        codeChallenge: row.challenge, expiresAt: row.expires_at };
      return Response.json(result);
    }
    return new Response(null, { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.state.blockConcurrencyWhile(async () => {
      this.storage.sql.exec("DELETE FROM codes WHERE expires_at <= ?", Date.now());
      const row = this.storage.sql.exec<{ next_expiry: number | null }>(
        "SELECT MIN(expires_at) AS next_expiry FROM codes",
      ).one();
      if (row.next_expiry !== null) await this.storage.setAlarm(row.next_expiry);
    });
  }
}
