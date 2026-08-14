# Codexa.ai

Codexa.ai is a real-time collaborative engineering workspace for pair programming, coding interviews, competitive problem solving, and system design. It combines a VS Code-inspired editor, shared rooms, sandboxed code execution, live presence, chat, AI assistance, and collaborative diagrams in one pnpm monorepo.

## Products

| Product | Route | What it provides |
| --- | --- | --- |
| Collaborative Coding | `/collaborative` | Multi-file shared editor, presence, chat, file search, terminal output, and room administration |
| LeetCode Arena | `/arena` | Problem browser, Monaco editor, run/submit workflow, leaderboard-ready submissions, and timed battle mode |
| System Design | `/system-design` | Collaborative architecture canvas, components and connections, simulation tools, and shared rooms |

The home page at `/` is the product launcher.

## Highlights

- Real-time rooms powered by Socket.IO, Yjs, and Monaco
- Admin and participant roles with invitations, removals, room links, and room lifecycle controls
- Persistent multi-file collaborative projects backed by PostgreSQL
- Live cursor awareness, active-user presence, chat, file explorer, file search, and status bar
- Coding Arena with curated problems, language starters, test execution, submissions, and editorials
- Timed head-to-head battle rooms with countdowns, participant state, results, and code reveal
- Collaborative system-design workspace with an Excalidraw-based canvas and simulation tools
- AI pair-programming endpoints compatible with OpenRouter and OpenAI-style providers
- BullMQ execution queue with Redis and Docker-isolated language runners
- Optional local host-runtime fallback for development when executor images are unavailable
- MCP server exposing problems, solutions, hints, editorials, and solution validation
- Auth.js credentials and GitHub authentication with Prisma persistence
- API hardening through validated configuration, CORS allowlists, Helmet, and rate limiting

## Architecture

```text
Browser (Next.js + Monaco + Excalidraw)
        │ HTTP / Socket.IO / Yjs
        ▼
API (Express + Socket.IO) ─────── PostgreSQL (Prisma)
        │                               │
        ├── Redis / BullMQ ───── Executor worker ───── Docker sandbox
        │
        └── OpenRouter-compatible AI provider

MCP clients ─────────────── MCP server ───────────── Problems package / API
```

## Technology

- Next.js 15, React 19, TypeScript, Tailwind CSS, and Framer Motion
- Monaco Editor, Excalidraw, Yjs, Socket.IO, and Prism
- Express, Zod, Helmet, and express-rate-limit
- Auth.js, Prisma, and PostgreSQL
- BullMQ, Redis, Dockerode, and Docker
- Model Context Protocol TypeScript SDK
- Turborepo and pnpm workspaces

## Repository layout

```text
apps/
  web/        Next.js frontend and Auth.js routes
  api/        REST API, realtime rooms, collaboration, battle, and AI services
  executor/   BullMQ worker and isolated code runners
  mcp/        MCP server with stdio and Streamable HTTP transports
packages/
  db/         Prisma schema, migrations, client, and seed script
  problems/   Curated coding problems, tests, starters, solutions, and editorials
  types/      Shared Zod schemas and TypeScript types
  ui/         Shared interface components
  config/     Shared TypeScript, ESLint, and Tailwind configuration
docker/
  executor/   Per-language executor Dockerfiles
  runner.sh   Sandbox entrypoint reference
archive/
  legacy-vite/  Preserved original Vite/Express application
```

## Prerequisites

- Node.js 20 or newer
- pnpm 9 (the repository pins `pnpm@9.15.4`)
- Docker Desktop or another compatible Docker engine

## Local setup

```bash
git clone https://github.com/manastole03/Codexa.ai.git
cd Codexa.ai
git checkout dev_user/manas_tole

pnpm install
cp .env.example .env
pnpm docker:up
pnpm --filter @codexa/db db:generate
pnpm db:push
pnpm db:seed
pnpm docker:build-execs
pnpm dev
```

After startup:

| Service | Address |
| --- | --- |
| Web application | http://localhost:3000 |
| API and WebSocket server | http://localhost:4000 |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

The seeded development account is `demo@arena.dev` with password `password123`.

### Port conflicts

The web and API ports can be changed when their defaults are occupied:

```bash
# API on 4002
API_PORT=4002 CORS_ORIGINS=http://localhost:3003 pnpm --filter @codexa/api dev

# Web on 3003, connected to the alternate API
NEXT_PUBLIC_API_URL=http://localhost:4002 \
NEXTAUTH_URL=http://localhost:3003 \
pnpm --filter @codexa/web exec next dev -p 3003
```

Run the executor separately with `pnpm dev:executor` when using this split startup.

## Environment variables

Copy `.env.example` to `.env`. The most important settings are:

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_URL` | Public URL used by Auth.js |
| `AUTH_SECRET` | Auth.js signing secret; required in production |
| `NEXT_PUBLIC_API_URL` | Browser-facing API URL |
| `API_PORT` | Express server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis/BullMQ connection string |
| `CORS_ORIGINS` | Comma-separated browser origin allowlist |
| `OPENROUTER_API_KEY` | OpenRouter credential for room AI features |
| `OPENROUTER_MODEL` | Model used by the AI assistant |
| `EXECUTOR_WALL_TIMEOUT_MS` | Maximum execution wall time |
| `EXECUTOR_MEMORY_MB` | Per-container memory limit |

Never commit a populated `.env` file or real provider credentials.

## Common commands

```bash
pnpm dev                 # Run all workspace development services
pnpm dev:web             # Run only the Next.js app
pnpm dev:api             # Run only the API and realtime server
pnpm dev:executor        # Run only the BullMQ executor
pnpm dev:mcp             # Run the MCP server over stdio
pnpm build               # Build every workspace package
pnpm typecheck           # Type-check every workspace package
pnpm lint                # Lint every workspace package
pnpm --filter @codexa/db db:generate  # Generate the Prisma client
pnpm db:push             # Push the schema in local development
pnpm db:seed             # Seed the demo user and problem catalog
pnpm docker:build-execs  # Build JavaScript, Python, and C++ runner images
pnpm docker:down         # Stop PostgreSQL and Redis
```

## Code execution flow

1. The web application posts a run or submission request to `/api/submissions`.
2. The Next.js handler forwards it to the Express API.
3. The API validates the payload and adds a BullMQ job to Redis.
4. The executor runs each test in the configured language sandbox.
5. The API returns per-test status, output, errors, and runtime, and persists submissions when applicable.

The first-class Docker runners are JavaScript, Python, and C++. Additional language definitions are scaffolded under `docker/executor/` and `apps/executor/src/languages.ts`.

Each Docker execution runs without network access, with a read-only root filesystem, a temporary work directory, dropped Linux capabilities, process limits, and configurable CPU, memory, and wall-time limits. The host fallback is intended only for trusted local development; production deployments should use the Docker sandbox and stronger isolation such as gVisor or Kata Containers where appropriate.

## MCP server

Run the server over stdio:

```bash
pnpm --filter @codexa/mcp dev
```

Or start its Streamable HTTP transport on port 5050:

```bash
pnpm --filter @codexa/mcp dev:http
```

Available tools include `list_products`, `list_problems`, `get_problem`, `get_solution`, `get_editorial`, `get_hints`, and `validate_solution`. Resources use the forms `problem://<slug>`, `solution://<slug>/<language>`, and `editorial://<slug>`.

## Adding a problem

1. Create `packages/problems/src/problems/<slug>.ts`.
2. Export a `Problem` using the package's `mkProblem` helper.
3. Add the problem to `packages/problems/src/index.ts`.
4. Run `pnpm db:seed`.

The seed operation upserts problem metadata and refreshes examples, constraints, hints, starter code, reference solutions, and test cases.

## Production notes

- Set a strong `AUTH_SECRET` and explicit `CORS_ORIGINS`.
- Apply checked-in migrations with `pnpm --filter @codexa/db db:migrate:deploy`.
- Keep PostgreSQL and Redis private and authenticated.
- Build and control private executor images; do not enable host fallback for untrusted code.
- Put the web and API services behind TLS and configure `TRUST_PROXY` for the deployment topology.
- Store AI and OAuth credentials in the deployment platform's secret manager.

## License

No license has been declared. All rights are reserved unless the repository owner states otherwise.
