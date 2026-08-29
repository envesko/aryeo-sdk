# Aryeo MCP server

Lets Claude and other agents work an Aryeo account directly, over the Model Context Protocol. Runs on Cloudflare Workers, on the free tier.

**You host this yourself.** One deployment serves one Aryeo account: yours. Nobody operates a shared instance, and there is no account to sign up for. The whole thing is about a hundred lines on top of `@envesko/aryeo-client`, because every tool is generated from the same description of the API the clients are.

39 tools covering orders, listings, appointments, scheduling, customers, the catalogue, team members, tags, tasks and payroll.

## Deploy it

**Every command below runs on your own machine, in a terminal.** Nothing is typed into the Cloudflare dashboard. `wrangler` is a command line tool that talks to Cloudflare's API for you; the worker itself then runs on Cloudflare's network, not on your machine.

You need [Node 20 or newer](https://nodejs.org), a free Cloudflare account, and an Aryeo API token. About five minutes.

**1. Get the code and build it.**

```bash
git clone https://github.com/envesko/aryeo-sdk
cd aryeo-sdk
npm install
npm run build
cd packages/mcp-worker
```

The build step matters: the worker imports the TypeScript client from this same repository, so the client has to be compiled first.

**2. Log in to Cloudflare.** This opens a browser and asks you to authorise wrangler.

```bash
npx wrangler login
```

**3. Make a KV namespace.** It holds registered clients, short-lived authorisation codes and access token hashes.

```bash
npx wrangler kv namespace create OAUTH_KV
```

Copy the `id` it prints into `wrangler.jsonc`, replacing `replace-with-your-own-namespace-id`.

**4. Set the two secrets.** These are stored encrypted in Cloudflare, never written to disk. Each command prompts for the value so it stays out of your shell history.

```bash
npx wrangler secret put ARYEO_API_TOKEN     # your Aryeo API token
npx wrangler secret put MCP_APPROVAL_CODE   # invent one, keep it somewhere safe
```

For the approval code, generate something unguessable rather than choosing one:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

**5. Deploy.**

```bash
npx wrangler deploy
```

Wrangler prints the URL it deployed to. Check it came up:

```bash
curl https://aryeo-mcp.<your-subdomain>.workers.dev/health
# {"ok":true,"server":"aryeo","tools":39}
```

**6. Connect Claude.** Add a custom connector pointing at that URL. Claude registers itself, sends you to an approval page, and you paste the approval code from step 4. That is the only time you need it.

### If something goes wrong

`wrangler deploy` fails with a KV error: the namespace id in `wrangler.jsonc` is still the placeholder, or belongs to a different account than the one you logged into.

`/health` works but Claude cannot connect: check you gave it the full `https://` URL, and that step 4 actually set both secrets (`npx wrangler secret list`).

Every tool returns an authorisation error: the Aryeo token is wrong or lacks access. `npx wrangler tail` shows live logs without exposing the token.

## What the approval code is for

This server has exactly one user, so there is no login. Authorisation is you proving the deployment is yours by pasting a code only you have.

It is not a password you share. Anybody who has it can connect a client that then acts with full access to your Aryeo account: orders, listings, customers, media, and the writes below.

The token a client receives lasts 30 days and is stored only as a hash, so a dump of your KV namespace yields nothing usable. To cut off every connected client, rotate the approval code and delete the tokens:

```bash
npx wrangler secret put MCP_APPROVAL_CODE
npx wrangler kv key list --binding OAUTH_KV | grep '"token:' 
```

## Writes

Eight tools change data in Aryeo. Each one requires the agent to echo an identifier from the record it is about to change, which means it has to have read the record first and cannot fire one off a guess.

```
appointments_cancel   appointments_create   appointments_reschedule
orders_deliver        orders_tags_add       orders_tags_remove
customers_create      payroll_items_create
```

`orders_deliver` publishes a listing and emails the agent. `appointments_cancel` tells whoever holds the slot that it is gone. Neither can be undone from here.

If you would rather run read-only, do not grant those: deploy with an Aryeo token that lacks write permission. The server does not restrict by tool, and pretending otherwise would be security theatre when the token behind it can do everything.

## Security notes

The Aryeo token exists only as a Worker secret and never appears in a response, an error message or a log line.

Authorisation uses PKCE with S256, so an intercepted code cannot be exchanged without the verifier. Redirect targets are allowlisted to Claude's domains and loopback, which matters because dynamic client registration means anyone can register a client. Authorisation codes are single use and expire in ten minutes.

The worker refuses every MCP request without a valid token, and there is no configuration in which it serves unauthenticated traffic.

## Endpoints

| | |
|---|---|
| `POST /mcp` and `POST /` | MCP, bearer protected |
| `GET /health` | liveness, no auth |
| `GET /.well-known/oauth-authorization-server` | discovery |
| `GET /.well-known/oauth-protected-resource` | discovery |
| `POST /register` | dynamic client registration |
| `GET POST /authorize` | approval |
| `POST /token` | code exchange |

## Local development

```bash
npx wrangler dev
```

`wrangler dev` uses local KV, so register and approve against `http://localhost:8787` the same way.

MIT, copyright Envesko. An independent project, not affiliated with Aryeo.
