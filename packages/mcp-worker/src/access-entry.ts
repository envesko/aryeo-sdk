import worker, { type Env } from "./index.js";

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    if (env.MCP_AUTH_MODE !== "access_only" || env.MCP_REQUIRE_ACCESS_ONLY !== "true" ||
        typeof env.MCP_ACCESS_AUDIENCE !== "string" || !env.MCP_ACCESS_AUDIENCE.trim()) {
      return Response.json({ error: "Access authentication is not configured." }, { status: 503 });
    }
    return worker.fetch(request, env, ctx);
  },
};
