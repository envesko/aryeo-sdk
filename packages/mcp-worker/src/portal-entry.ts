import worker, { type Env } from "./index.js";

function isPortalBearerConfigured(env: Env): boolean {
  return env.MCP_AUTH_MODE === "portal_bearer" && env.MCP_REQUIRE_PORTAL_BEARER === "true" &&
    typeof env.MCP_ACCESS_AUDIENCE === "string" && Boolean(env.MCP_ACCESS_AUDIENCE.trim());
}

// Dedicated deployment entrypoint: never fall back to the generic OAuth mode.
export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    if (!isPortalBearerConfigured(env)) {
      return Response.json({ error: "Portal authentication is not configured." }, { status: 503 });
    }
    return worker.fetch(request, env, ctx);
  },
};
