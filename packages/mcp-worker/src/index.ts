/**
 * Aryeo MCP server.
 *
 * Model Context Protocol over HTTP, so Claude and other agents can work an
 * Aryeo account directly. Deploys to Cloudflare Workers.
 *
 * Self-hosted: one deployment serves one Aryeo account, the one whose key the
 * operator sets as a secret. There are no user accounts, so authorisation is
 * the operator proving the deployment is theirs. See oauth.ts.
 *
 * Every tool is generated from the manifest and dispatched through the same
 * client a TypeScript integration would use, which is the point: the tool
 * surface cannot drift from the API, and the protections a caller gets are the
 * ones the client already enforces. A parameter the API ignores is not offered
 * as a tool argument, a write refuses to fire without confirmation, and the
 * scan metadata reaches the agent so it can tell a complete answer from a
 * partial one.
 */
import { AryeoCore, AryeoError } from "@envesko/aryeo-client";
import type { OperationId } from "@envesko/aryeo-client";
import { TOOLS, TOOLS_BY_NAME } from "./generated/tools.v1.js";
import type { OAuthEnv } from "./oauth.js";
import { routeOAuthRequest } from "./oauth-routing.js";
import { validatePortalRequest, type PortalEnv } from "./portal-security.js";
export { AuthorizationCodes } from "./authorization-codes.js";

export interface Env extends OAuthEnv, PortalEnv {}

const PROTOCOL_VERSION = "2024-11-05";
const SERVER = { name: "aryeo", version: "0.1.0" };

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const result = (id: JsonRpcRequest["id"], value: unknown): Response =>
  json({ jsonrpc: "2.0", id: id ?? null, result: value });

const error = (id: JsonRpcRequest["id"], code: number, message: string, status = 200): Response =>
  json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, status);

async function callTool(
  env: Env,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `No tool named ${name}.` }],
      isError: true,
    };
  }

  try {
    const core = new AryeoCore({ apiKey: env.ARYEO_API_TOKEN });
    const response = await core.call(tool.operationId as OperationId, args);
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    // The client's errors are written to be read by whoever hit them, so they
    // pass through as-is rather than being flattened into "request failed".
    // They never carry the credential.
    const message = err instanceof AryeoError ? err.message : "The request failed.";
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

async function dispatchRequest(body: JsonRpcRequest, env: Env, protocolVersion = PROTOCOL_VERSION): Promise<Response> {
  switch (body.method) {
    case "initialize":
      return result(body.id, { protocolVersion, capabilities: { tools: {} }, serverInfo: SERVER });
    case "notifications/initialized":
      return new Response(null, { status: 204 });
    case "tools/list":
      return result(body.id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call":
      return dispatchTool(body, env);
    case "ping":
      return result(body.id, {});
    default:
      return error(body.id, -32601, `Unsupported method ${body.method}.`);
  }
}

function isRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  if (body["jsonrpc"] !== "2.0") return false;
  return typeof body["method"] === "string";
}

async function dispatchTool(body: JsonRpcRequest, env: Env): Promise<Response> {
  const name = body.params?.["name"];
  if (typeof name !== "string") return error(body.id, -32602, "A tool name is required.");
  const args = (body.params?.["arguments"] ?? {}) as Record<string, unknown>;
  return result(body.id, await callTool(env, name, args));
}

async function dispatchMcpRequest(request: Request, env: Env, accessOnly: boolean): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(null, -32700, "Invalid JSON.", accessOnly ? 400 : 200);
  }
  if (!isRpcRequest(body)) return error(null, -32600, "Invalid request.", accessOnly ? 400 : 200);
  if (accessOnly) {
    if (body.id === undefined) {
      return body.method === "notifications/initialized"
        ? new Response(null, { status: 202 })
        : json({ error: "Unsupported notification." }, 400);
    }
    if (body.method === "notifications/initialized") return error(body.id, -32600, "Invalid request.");
    return dispatchRequest(body, env, "2025-06-18");
  }
  return dispatchRequest(body, env);
}

async function handlePortalRequest(request: Request, env: Env, url: URL, ctx?: ExecutionContext): Promise<Response> {
  const denied = await validatePortalRequest(request, env, url, ctx);
  if (denied) return denied;
  return dispatchMcpRequest(request, env, env.MCP_AUTH_MODE === "access_only");
}

function invalidAuthenticationMode(env: Env): boolean {
  const accessPinFailed = env.MCP_REQUIRE_ACCESS_ONLY !== undefined &&
    (env.MCP_REQUIRE_ACCESS_ONLY !== "true" || env.MCP_AUTH_MODE !== "access_only");
  const portalPinFailed = env.MCP_REQUIRE_PORTAL_BEARER !== undefined &&
    (env.MCP_REQUIRE_PORTAL_BEARER !== "true" || env.MCP_AUTH_MODE !== "portal_bearer");
  const supportedMode = env.MCP_AUTH_MODE === undefined ||
    ["oauth", "portal_bearer", "access_only"].includes(env.MCP_AUTH_MODE);
  return accessPinFailed || portalPinFailed || !supportedMode;
}

async function handleOAuthRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const response = await routeOAuthRequest({ request, env, url, server: SERVER.name, tools: TOOLS.length, json });
  if (response) return response;
  return dispatchMcpRequest(request, env, false);
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (invalidAuthenticationMode(env)) {
      return json({ error: "Authentication mode is not configured." }, 503);
    }
    if (env.MCP_AUTH_MODE === "portal_bearer" || env.MCP_AUTH_MODE === "access_only") return handlePortalRequest(request, env, url, ctx);
    return handleOAuthRequest(request, env, url);
  },
};
