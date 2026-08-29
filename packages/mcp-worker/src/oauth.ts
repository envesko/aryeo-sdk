/**
 * OAuth for a self-hosted server.
 *
 * Every deployment of this worker serves exactly one Aryeo account: the one
 * whose key the operator set as a secret. So there are no user accounts here
 * and nothing to look up. The only question at authorisation time is whether
 * the person at the browser is the operator, and they prove that by pasting
 * the approval code they set when they deployed it.
 *
 * That is deliberately not a login system. It is the smallest thing that lets
 * an MCP client which expects OAuth connect to a server that has exactly one
 * user, without inventing a user database nobody wants to run.
 *
 * What it still does properly, because these are what stop a connector being
 * a liability:
 *
 *   PKCE is required, S256 only. An intercepted authorisation code is useless
 *   without the verifier.
 *
 *   Redirect targets are allowlisted. Dynamic client registration means anyone
 *   can register a client, so the redirect is the thing that decides where a
 *   code can be delivered.
 *
 *   Access tokens are stored as hashes. A leaked KV dump does not yield
 *   working tokens.
 *
 *   Authorisation codes are single use and short lived.
 */

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTH_CODE_TTL_SECONDS = 600;
const CLIENT_TTL_SECONDS = 60 * 60 * 24 * 365;

/** Where an authorisation code may be delivered. */
const ALLOWED_REDIRECT_HOSTS = new Set([
  "claude.ai",
  "www.claude.ai",
  "api.claude.ai",
  "claude.com",
  "www.claude.com",
  "api.claude.com",
  // RFC 8252 loopback, for desktop and CLI clients. Only reachable from the
  // machine running the client, so a code cannot be intercepted remotely.
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

export interface OAuthEnv {
  OAUTH_KV: KVNamespace;
  /** The operator pastes this at /authorize to prove the deployment is theirs. */
  MCP_APPROVAL_CODE: string;
}

interface StoredClient {
  clientId: string;
  redirectUris: string[];
  name: string;
}

interface StoredAuthCode {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const oauthError = (error: string, description: string, status = 400): Response =>
  json({ error, error_description: description }, status);

function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant time, so a secret cannot be learned from response timing. */
export function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAllowedRedirect(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!ALLOWED_REDIRECT_HOSTS.has(url.hostname)) return false;
  // Loopback may be http because there is no transport to protect on the same
  // machine. Everything else must be https.
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return url.protocol === "https:" || (loopback && url.protocol === "http:");
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

function approvalPage(params: URLSearchParams, clientName: string, message?: string): Response {
  // Workers do not expose URLSearchParams.entries(), and the approval code
  // must never be echoed back into the page it came from.
  const fields: string[] = [];
  params.forEach((value, key) => {
    if (key === "approval_code") return;
    fields.push(`<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`);
  });
  const hidden = fields.join("\n      ");

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect to Aryeo</title>
  <style>
    body { margin: 0; background: #0f1117; color: #eef0f4;
           font-family: Inter, "Segoe UI", system-ui, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    main { width: 100%; max-width: 420px; padding: 32px; box-sizing: border-box; }
    h1 { font-size: 24px; margin: 0 0 8px; letter-spacing: -0.02em; }
    p { color: #a8b0c0; line-height: 1.55; margin: 0 0 20px; font-size: 15px; }
    .rule { height: 3px; width: 96px; border-radius: 2px; margin: 0 0 24px;
            background: linear-gradient(90deg, #2ea5cb, #2edcb7); }
    label { display: block; font-size: 13px; color: #8b93a7; margin-bottom: 8px; }
    input[type=password] { width: 100%; box-sizing: border-box; padding: 11px 13px;
      background: #171a22; border: 1px solid #232733; border-radius: 6px;
      color: #eef0f4; font-family: ui-monospace, monospace; font-size: 14px; }
    input[type=password]:focus { outline: none; border-color: #2edcb7; }
    button { margin-top: 16px; width: 100%; padding: 11px; border: 0; border-radius: 6px;
      background: linear-gradient(135deg, #2ea5cb, #2edcb7); color: #06251f;
      font-weight: 600; font-size: 15px; cursor: pointer; }
    .err { color: #e0575b; font-size: 14px; margin: 0 0 16px; }
    .who { color: #6dd4ea; }
  </style>
</head>
<body>
  <main>
    <h1>Connect to Aryeo</h1>
    <div class="rule"></div>
    <p><span class="who">${escapeHtml(clientName)}</span> is asking to use this server, which acts on one Aryeo account with full access to its orders, listings, customers and media.</p>
    ${message ? `<p class="err">${escapeHtml(message)}</p>` : ""}
    <form method="POST">
      ${hidden}
      <label for="code">Approval code</label>
      <input id="code" name="approval_code" type="password" autocomplete="off" autofocus required>
      <button type="submit">Approve</button>
    </form>
  </main>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/**
 * Handles every OAuth route. Returns null when the path is not one of ours, so
 * the caller can carry on to the MCP endpoint.
 */
export async function handleOAuth(
  request: Request,
  env: OAuthEnv,
  url: URL,
): Promise<Response | null> {
  const issuer = url.origin;

  if (url.pathname === "/.well-known/oauth-authorization-server" && request.method === "GET") {
    return json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      registration_endpoint: `${issuer}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  }

  if (url.pathname === "/.well-known/oauth-protected-resource" && request.method === "GET") {
    return json({ resource: issuer, authorization_servers: [issuer] });
  }

  // Dynamic client registration. Anyone may register, which is why the
  // redirect allowlist rather than the client identity is what protects this.
  if (url.pathname === "/register" && request.method === "POST") {
    let body: { redirect_uris?: unknown; client_name?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return oauthError("invalid_request", "The registration body must be JSON.");
    }

    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.filter((u): u is string => typeof u === "string")
      : [];
    if (redirectUris.length === 0) {
      return oauthError("invalid_redirect_uri", "At least one redirect_uri is required.");
    }
    for (const uri of redirectUris) {
      if (!isAllowedRedirect(uri)) {
        return oauthError(
          "invalid_redirect_uri",
          `${uri} is not an allowed redirect target for this server.`,
        );
      }
    }

    const clientId = randomToken(16);
    const client: StoredClient = {
      clientId,
      redirectUris,
      name: typeof body.client_name === "string" ? body.client_name.slice(0, 80) : "An MCP client",
    };
    await env.OAUTH_KV.put(`client:${clientId}`, JSON.stringify(client), {
      expirationTtl: CLIENT_TTL_SECONDS,
    });

    return json(
      {
        client_id: clientId,
        client_name: client.name,
        redirect_uris: redirectUris,
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      201,
    );
  }

  if (url.pathname === "/authorize") {
    const params =
      request.method === "POST"
        ? new URLSearchParams(await request.text())
        : url.searchParams;

    const clientId = params.get("client_id") ?? "";
    const redirectUri = params.get("redirect_uri") ?? "";
    const codeChallenge = params.get("code_challenge") ?? "";
    const method = params.get("code_challenge_method") ?? "";
    const state = params.get("state") ?? "";

    const stored = await env.OAUTH_KV.get(`client:${clientId}`);
    if (!stored) return oauthError("invalid_client", "Unknown client. Register first.");
    const client = JSON.parse(stored) as StoredClient;

    if (!client.redirectUris.includes(redirectUri) || !isAllowedRedirect(redirectUri)) {
      return oauthError("invalid_redirect_uri", "That redirect_uri was not registered.");
    }
    // Without PKCE an intercepted code is enough to mint a token.
    if (method !== "S256" || codeChallenge.length < 43) {
      return oauthError("invalid_request", "PKCE with S256 is required.");
    }

    if (request.method === "GET") {
      return approvalPage(params, client.name);
    }

    if (request.method === "POST") {
      const supplied = params.get("approval_code") ?? "";
      if (!env.MCP_APPROVAL_CODE || !secretsMatch(supplied, env.MCP_APPROVAL_CODE)) {
        // Re-render rather than redirect, so a wrong code never reaches the
        // client as a failed authorisation.
        const retry = new URLSearchParams(params);
        retry.delete("approval_code");
        return approvalPage(retry, client.name, "That approval code is not correct.");
      }

      const code = randomToken(32);
      const payload: StoredAuthCode = { clientId, redirectUri, codeChallenge };
      await env.OAUTH_KV.put(`code:${code}`, JSON.stringify(payload), {
        expirationTtl: AUTH_CODE_TTL_SECONDS,
      });

      const target = new URL(redirectUri);
      target.searchParams.set("code", code);
      if (state) target.searchParams.set("state", state);
      return new Response(null, { status: 302, headers: { Location: target.toString() } });
    }

    return oauthError("invalid_request", "Use GET or POST.", 405);
  }

  if (url.pathname === "/token" && request.method === "POST") {
    const form = new URLSearchParams(await request.text());

    if (form.get("grant_type") !== "authorization_code") {
      return oauthError("unsupported_grant_type", "Only authorization_code is supported.");
    }

    const code = form.get("code") ?? "";
    const verifier = form.get("code_verifier") ?? "";
    const redirectUri = form.get("redirect_uri") ?? "";
    const clientId = form.get("client_id") ?? "";

    const raw = await env.OAUTH_KV.get(`code:${code}`);
    if (!raw) return oauthError("invalid_grant", "That code is unknown, used or expired.");
    // Single use: consume it before anything else can.
    await env.OAUTH_KV.delete(`code:${code}`);

    const stored = JSON.parse(raw) as StoredAuthCode;
    if (stored.clientId !== clientId || stored.redirectUri !== redirectUri) {
      return oauthError("invalid_grant", "That code was issued for a different client.");
    }
    if ((await sha256Base64Url(verifier)) !== stored.codeChallenge) {
      return oauthError("invalid_grant", "The code verifier does not match.");
    }

    const accessToken = randomToken(32);
    // Stored as a hash, so a KV dump yields nothing usable.
    await env.OAUTH_KV.put(`token:${await sha256Hex(accessToken)}`, clientId, {
      expirationTtl: ACCESS_TOKEN_TTL_SECONDS,
    });

    return json(
      { access_token: accessToken, token_type: "Bearer", expires_in: ACCESS_TOKEN_TTL_SECONDS },
      200,
      { "Cache-Control": "no-store" },
    );
  }

  return null;
}

/** Whether a request carries a token this server issued. */
export async function isAuthorised(request: Request, env: OAuthEnv): Promise<boolean> {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const presented = header.slice(7).trim();
  if (presented.length === 0) return false;
  return (await env.OAUTH_KV.get(`token:${await sha256Hex(presented)}`)) !== null;
}
