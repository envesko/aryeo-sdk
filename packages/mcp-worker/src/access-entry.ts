import worker, { type Env } from "./index.js";

function isAccessOnlyConfigured(env: Env): boolean {
  return env.MCP_AUTH_MODE === "access_only" && env.MCP_REQUIRE_ACCESS_ONLY === "true" &&
    typeof env.MCP_ACCESS_AUDIENCE === "string" && Boolean(env.MCP_ACCESS_AUDIENCE.trim());
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    if (!isAccessOnlyConfigured(env)) {
      return Response.json({ error: "Access authentication is not configured." }, { status: 503 });
    }
    return worker.fetch(request, env, ctx);
  },
};
