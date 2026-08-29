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
import { handleOAuth, isAuthorised, type OAuthEnv } from "./oauth.js";

export interface Env extends OAuthEnv {
  /**
   * The Aryeo API token this deployment acts with. One deployment, one
   * account: this server is meant to be self-hosted by whoever owns the key.
   */
  ARYEO_API_TOKEN: string;
}

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

const error = (id: JsonRpcRequest["id"], code: number, message: string): Response =>
  json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

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

  const core = new AryeoCore({ apiKey: env.ARYEO_API_TOKEN });

  try {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, server: SERVER.name, tools: TOOLS.length });
    }

    // Discovery, registration, approval and token exchange.
    const oauth = await handleOAuth(request, env, url);
    if (oauth !== null) return oauth;

    if (request.method !== "POST") {
      return json({ error: "Send MCP requests as POST." }, 405);
    }

    if (!(await isAuthorised(request, env))) {
      // The resource metadata pointer is what lets a client discover where to
      // authenticate rather than simply failing.
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate":
            `Bearer realm="${SERVER.name}", ` +
            `resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
        },
      });
    }

    let body: JsonRpcRequest;
    try {
      body = (await request.json()) as JsonRpcRequest;
    } catch {
      return error(null, -32700, "Invalid JSON.");
    }

    switch (body.method) {
      case "initialize":
        return result(body.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER,
        });

      case "notifications/initialized":
        return new Response(null, { status: 204 });

      case "tools/list":
        return result(body.id, {
          tools: TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });

      case "tools/call": {
        const name = body.params?.["name"];
        if (typeof name !== "string") return error(body.id, -32602, "A tool name is required.");
        const args = (body.params?.["arguments"] ?? {}) as Record<string, unknown>;
        return result(body.id, await callTool(env, name, args));
      }

      case "ping":
        return result(body.id, {});

      default:
        return error(body.id, -32601, `Unsupported method ${body.method}.`);
    }
  },
};
