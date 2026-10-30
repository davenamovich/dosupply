# DO Supply × Plunder & Riffle — AI Marketing Engine

A demo marketing engine for DO Supply (industrial automation replacement parts). One product or
topic goes in; social posts, video scripts, email campaigns, SEO copy, review responses and a
10-format content package come out, all grounded in verified brand facts.

## Stack

- **Next.js** (App Router, React 19) with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **Prisma** — schema under `prisma/`, local SQLite database
- **Bun** as package manager and runtime; **Dockerfile** for deployment

## Quick start

```bash
bun install
cp .env.example .env      # then fill in the values
bun run dev               # http://localhost:3000
```

On Windows you can also double-click `launch.bat`, which starts the app on port 3000.

## Environment variables

Copy `.env.example` to `.env` and fill it in. Everything is read server-side only — no variable is
exposed to the browser. Never commit `.env`; it is gitignored.

### LLM provider (required)

`/api/generate` calls any **OpenAI-compatible** `/chat/completions` endpoint, so you can point it at
whichever provider you want (DeepSeek, Groq, OpenRouter, GLM, Gemini's OpenAI-compatible endpoint,
a self-hosted gateway, …).

| Variable       | Required | Purpose                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `LLM_BASE_URL` | yes      | Base URL, e.g. `https://api.deepseek.com/v1`. `/chat/completions` is appended unless already present. |
| `LLM_API_KEY`  | yes      | Sent as `Authorization: Bearer <key>`.                                   |
| `LLM_MODEL`    | yes      | Model name, e.g. `deepseek-chat`.                                       |

If any of the three is missing, the route fails fast with an explicit message naming the missing
variables rather than falling back to a default provider.

### Web research (optional)

`/api/research` grounds generation in live search results. At least one provider is needed for the
"Research on the web" button; Exa is tried first, TinyFish is the fallback.

| Variable               | Required | Purpose                                                          |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `EXA_API_KEY`          | optional | Primary research provider (Exa).                                  |
| `TINYFISH_API_KEY`     | optional | Fallback search provider (free to 12k requests/day).              |
| `TINYFISH_SEARCH_URL`  | optional | Override the search endpoint; defaults to `https://api.search.tinyfish.ai`. |

### Plunder & Riffle MCP (optional)

| Variable                  | Required | Purpose                                            |
| ------------------------- | -------- | -------------------------------------------------- |
| `PLUNDER_RIFFLE_API_KEY`  | optional | Bearer token for the P&R MCP engine.               |
| `PLUNDER_RIFFLE_MCP_URL`  | optional | Override the MCP endpoint; defaults to `https://bot.plunderandriffle.com/api/mcp`. |

### Setup panel

| Variable         | Required | Purpose                                                                   |
| ---------------- | -------- | ------------------------------------------------------------------------- |
| `ADMIN_PASSCODE` | yes (to use the panel) | Gates saving and clearing BYOK keys. There is no default — with it unset, the panel stays locked. |

### Runtime

| Variable | Required | Purpose                                                            |
| -------- | -------- | ------------------------------------------------------------------ |
| `PORT`   | Railway  | Injected by the platform; the standalone server listens on it (3000 locally). |

## Keys: env vars vs the setup panel

Both P&R and Exa keys resolve in this order:

1. **Runtime store** — `db/runtime-keys.json`, written by the setup panel (mode `0600`).
2. **Environment variable** — `PLUNDER_RIFFLE_API_KEY` / `EXA_API_KEY`.

The panel only ever returns masked previews. Saving a P&R key verifies it against the engine with a
real auth-gated `tools/call` before storing it. Container filesystems are ephemeral, so on Railway
prefer environment variables; the runtime file is for local or single-instance use.

## API routes

| Route           | Method        | Notes                                                        |
| --------------- | ------------- | ------------------------------------------------------------ |
| `/`             | GET           | The marketing studio UI.                                     |
| `/api/generate` | POST          | Mode-switched content generation (`social`, `video`, `email`, `seo`, `reputation`, `multiplier`). Rate limited per IP. |
| `/api/research` | GET / POST    | Provider badge; live web search grounding.                   |
| `/api/keys`     | GET / POST / DELETE | Masked key status; save and clear keys (passcode-gated). |
| `/api/status`   | GET           | MCP connection, key sources, active research provider.       |

## Deploying on Railway

The `Dockerfile` builds the Next standalone output and runs `server.js` on `$PORT`.

1. Push the repo and create a Railway service from it (Dockerfile is detected automatically).
2. Set the variables above on the service — at minimum `LLM_BASE_URL`, `LLM_API_KEY`,
   `LLM_MODEL`, and `ADMIN_PASSCODE` if you need the setup panel.
3. Generate a public domain. Railway terminates TLS, so no proxy configuration is required.

`db/` is created during the build because the runtime store is gitignored, so a clean clone has no
such directory.
