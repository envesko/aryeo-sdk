import { handleOAuth, isAuthorised, type OAuthEnv } from "./oauth.js";

interface OAuthRequestContext {
  request: Request;
  env: OAuthEnv;
  url: URL;
  server: string;
  tools: number;
  json: (body: unknown, status?: number) => Response;
}

function validateMcpRoute({ request, url, json }: OAuthRequestContext): Response | null {
  if (request.method !== "POST") return json({ error: "Send MCP requests as POST." }, 405);
  if (!["/", "/mcp"].includes(url.pathname)) return json({ error: "Not found." }, 404);
  return null;
}

function unauthorized({ server, url }: OAuthRequestContext): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate":
        `Bearer realm="${server}", ` +
        `resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

export async function routeOAuthRequest(context: OAuthRequestContext): Promise<Response | null> {
  const { request, env, url, server, tools, json } = context;
  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, server, tools });
  }
  const oauth = await handleOAuth(request, env, url);
  if (oauth !== null) return oauth;
  const invalid = validateMcpRoute(context);
  if (invalid) return invalid;
  if (!(await isAuthorised(request, env))) return unauthorized(context);
  return null;
}
