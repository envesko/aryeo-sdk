export interface PortalEnv {
  /**
   * The Aryeo API token this deployment acts with. One deployment, one
   * account: this server is meant to be self-hosted by whoever owns the key.
   */
  ARYEO_API_TOKEN: string;
  /** Omitted or oauth keeps the existing OAuth flow; portal_bearer is opt-in. */
  MCP_AUTH_MODE?: string;
  /** A separate, high-entropy secret used only for portal-to-Worker access. */
  MCP_PORTAL_TOKEN?: string;
  /** Pin a dedicated deployment to portal mode even if its mode variable is removed. */
  MCP_REQUIRE_PORTAL_BEARER?: string;
  /** Pin a deployment to Cloudflare Access service-token authentication. */
  MCP_REQUIRE_ACCESS_ONLY?: string;
  /** Access application audience that must authenticate the Worker request. */
  MCP_ACCESS_AUDIENCE?: string;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function equalSecrets(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  // Cloudflare's non-standard extension is omitted by some DOM type libraries.
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean };
  return subtle.timingSafeEqual(leftHash, rightHash);
}

async function invalidPortalConfiguration(env: PortalEnv, accessOnly: boolean): Promise<boolean> {
  const secret = env.MCP_PORTAL_TOKEN;
  const audience = env.MCP_ACCESS_AUDIENCE;
  // A 32-byte random value encoded as unpadded base64url is 43 characters.
  return typeof env.ARYEO_API_TOKEN !== "string" || !env.ARYEO_API_TOKEN.trim() ||
    typeof audience !== "string" || !audience.trim() ||
    (!accessOnly && (typeof secret !== "string" || !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(secret) ||
      await equalSecrets(secret, env.ARYEO_API_TOKEN)));
}

function validateAccessTransport(request: Request, url: URL): Response | null {
  const origin = request.headers.get("Origin");
  if (origin !== null && origin !== url.origin) return json({ error: "Invalid origin." }, 403);
  const version = request.headers.get("MCP-Protocol-Version");
  if (version !== null && version !== "2025-06-18") return json({ error: "Unsupported protocol version." }, 400);
  return null;
}
async function validatePortalIdentity(request: Request, env: PortalEnv, accessOnly: boolean, ctx?: ExecutionContext): Promise<Response | null> {
  // This context is supplied by the Workers platform after Access validates a
  // direct request. A caller-provided identity header is not sufficient.
  const access = (ctx as (ExecutionContext & { access?: { aud?: string } }) | undefined)?.access;
  if (!access || access.aud !== env.MCP_ACCESS_AUDIENCE) return json({ error: "Access required." }, 403);

  const supplied = /^Bearer (.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1] ?? "";
  if (!accessOnly && !(await equalSecrets(supplied, env.MCP_PORTAL_TOKEN ?? ""))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="aryeo"' },
    });
  }
  return null;
}

export async function validatePortalRequest(request: Request, env: PortalEnv, url: URL, ctx?: ExecutionContext): Promise<Response | null> {
  const accessOnly = env.MCP_AUTH_MODE === "access_only";
  if (await invalidPortalConfiguration(env, accessOnly)) {
    return json({ error: "Portal authentication is not configured." }, 503);
  }
  if (url.pathname !== "/mcp") return json({ error: "Not found." }, 404);
  if (request.method !== "POST") return json({ error: "Send MCP requests as POST." }, 405);
  if (accessOnly) {
    const invalidTransport = validateAccessTransport(request, url);
    if (invalidTransport) return invalidTransport;
  }
  const invalidIdentity = await validatePortalIdentity(request, env, accessOnly, ctx);
  if (invalidIdentity) return invalidIdentity;
  return null;
}
