# SubTrack — Project Summary & Claude Code Configuration

## Project Overview

**SubTrack** is a smart substitute-teacher management SaaS (Hebrew UI, RTL, Israeli market).
It allows municipalities to manage teacher absences and automatically match available substitute assistants.

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript 5 · Supabase (Auth + Realtime + PostGIS) · Tailwind CSS v4
- **Language**: Hebrew (`lang="he" dir="rtl"`) throughout UI
- **Multi-tenancy**: Each `municipality` is an isolated tenant; RLS enforces data boundaries

## Folder Structure

```
/                      ← Next.js project root
├── src/
│   ├── app/           ← App Router pages
│   │   ├── page.tsx              ← Root redirect (→ /login or /auth/confirm)
│   │   ├── layout.tsx            ← Root layout (HTML lang/dir, metadata)
│   │   ├── login/page.tsx        ← Login form (password + Google OAuth)
│   │   ├── dashboard/page.tsx    ← Protected dashboard (auth guard)
│   │   └── auth/
│   │       ├── callback/route.ts ← OAuth PKCE callback (exchanges code for session)
│   │       └── confirm/page.tsx  ← Implicit-flow token consumer
│   ├── components/
│   │   └── CoordinatorDashboard.tsx ← Main realtime dashboard (Supabase Realtime)
│   ├── lib/
│   │   ├── types.ts              ← All domain types (Municipality, School, Profile, Assistant, Absence, Assignment, Rating)
│   │   └── supabase/
│   │       ├── client.ts         ← Browser Supabase client
│   │       ├── server.ts         ← Server Supabase client (cookies)
│   │       └── middleware.ts     ← Session refresh + auth redirect logic
│   └── supabase/
│       └── config.toml           ← Local Supabase CLI config
├── middleware.ts      ← Next.js edge middleware (delegates to lib/supabase/middleware)
├── schema.sql         ← Full DB schema (enums, tables, PostGIS, RLS, seed data)
├── next.config.ts
└── tsconfig.json
```

## Domain Model

| Table | Purpose |
|-------|---------|
| `municipalities` | Tenants — each city/council is isolated |
| `schools` | Schools per municipality (PostGIS location) |
| `profiles` | Extended user profiles (linked to `auth.users`) |
| `assistants` | Substitute details: subjects, grades, rating, GPS location |
| `absences` | Teacher absence reports with status lifecycle |
| `assignments` | Offers sent to assistants; tracks accept/decline/expire |
| `ratings` | Post-assignment scores (1–5) |
| `whatsapp_logs` | Audit log for WhatsApp notifications |

**Absence status flow**: `open → matching → pending → confirmed / cancelled / no_show`

**Key DB function**: `find_available_assistants(school_id, subject, radius_km)` — weighted scoring (50% distance, 30% rating, 20% subject match)

## Auth Flow

- Password login via `supabase.auth.signInWithPassword`
- Google OAuth via `supabase.auth.signInWithOAuth` (redirects to `/auth/confirm?next=/dashboard`)
- **Note**: `client.ts` uses `flowType: 'implicit'` — this is deprecated; should be migrated to `pkce`
- Session refreshed on every request via `middleware.ts → lib/supabase/middleware.ts`
- Protected routes: anything not matching `/`, `/login`, `/auth/callback`, or static assets

## Known Issues & Improvements

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | High | `lib/supabase/client.ts:9` | `flowType: 'implicit'` is deprecated — migrate to PKCE |
| 2 | Medium | `app/auth/callback/route.ts:11` | `console.log` with cookie names left in production code |
| 3 | Medium | `components/CoordinatorDashboard.tsx:27` | State typed as `any[]` — use types from `lib/types.ts` |
| 4 | Medium | `app/auth/confirm/page.tsx:15` | `onAuthStateChange` subscription not unsubscribed on cleanup |
| 5 | Low | `next.config.ts:6` | `allowedDevOrigins` has a hardcoded LAN IP (`192.168.68.106`) — developer-specific |
| 6 | Low | Root | Missing `.env.example` file |
| 7 | Low | Root | No test setup (no Jest, Vitest, or Playwright) |
| 8 | Low | `app/layout.tsx` | No global CSS import — Tailwind is installed but unused (all styles are inline) |
| 9 | Info | `tsconfig.json` | `target: "ES2017"` — can be raised to `ES2020` |

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Conventions

- All UI components use inline `style={{}}` (no Tailwind classes used yet despite being configured)
- Google Font `Heebo` loaded via `@import` inside `<style>` tags — not via `next/font`
- `JetBrains Mono` used for monospaced values in dashboard
- Supabase queries do not currently handle error states (only `data` is destructured)

---

# Claude Code Configuration - RuFlo V3

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Ensure input validation at system boundaries

### Project Config

- **Topology**: hierarchical-mesh
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

## Build & Test

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL todos in ONE TodoWrite call (5-10+ minimum)
- ALWAYS spawn ALL agents in ONE message with full instructions via Task tool
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- MUST call CLI tools AND Task tool in ONE message for complex work

### 3-Tier Model Routing (ADR-026)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Simple transforms (var→const, add types) — Skip LLM |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[AGENT_BOOSTER_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- Use Edit tool directly when `[AGENT_BOOSTER_AVAILABLE]`

## Swarm Configuration & Anti-Drift

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## V3 CLI Commands

### Core Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `init` | 4 | Project initialization |
| `agent` | 8 | Agent lifecycle management |
| `swarm` | 6 | Multi-agent swarm coordination |
| `memory` | 11 | AgentDB memory with HNSW search |
| `task` | 6 | Task creation and lifecycle |
| `session` | 7 | Session state management |
| `hooks` | 17 | Self-learning hooks + 12 workers |
| `hive-mind` | 6 | Byzantine fault-tolerant consensus |

### Quick CLI Examples

```bash
npx @claude-flow/cli@latest init --wizard
npx @claude-flow/cli@latest agent spawn -t coder --name my-coder
npx @claude-flow/cli@latest swarm init --v3-mode
npx @claude-flow/cli@latest memory search --query "authentication patterns"
npx @claude-flow/cli@latest doctor --fix
```

## Available Agents (60+ Types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized
`security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`

## Memory Commands Reference

```bash
# Store (REQUIRED: --key, --value; OPTIONAL: --namespace, --ttl, --tags)
npx @claude-flow/cli@latest memory store --key "pattern-auth" --value "JWT with refresh" --namespace patterns

# Search (REQUIRED: --query; OPTIONAL: --namespace, --limit, --threshold)
npx @claude-flow/cli@latest memory search --query "authentication patterns"

# List (OPTIONAL: --namespace, --limit)
npx @claude-flow/cli@latest memory list --namespace patterns --limit 10

# Retrieve (REQUIRED: --key; OPTIONAL: --namespace)
npx @claude-flow/cli@latest memory retrieve --key "pattern-auth" --namespace patterns
```

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Claude Code vs CLI Tools

- Claude Code's Task tool handles ALL execution: agents, file ops, code generation, git
- CLI tools handle coordination via Bash: swarm init, memory, hooks, routing
- NEVER use CLI tools as a substitute for Task tool agents

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
