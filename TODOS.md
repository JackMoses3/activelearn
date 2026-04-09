# TODOS

## Error Boundary — Dashboard Layout DB Fetch

**What:** Wrap `getCourses()` in `layout.tsx` in a try/catch and pass an empty array to SideNav on failure.

**Why:** If the DB is unavailable at render time, the entire dashboard returns a 500. With a graceful fallback, the sidebar is empty but the page still loads.

**Pros:** Zero-cost resilience. No visible impact under normal conditions.

**Cons:** None meaningful.

**Context:** `getCourses()` runs server-side in `app/(dashboard)/layout.tsx:6`. Next.js does not automatically catch thrown promises in async server components — an unhandled throw here surfaces as a 500. Fix is a 3-line try/catch with fallback to `[]`.

**Depends on:** Nothing.

---

## Rate Limiting — Public API Routes

**What:** Add rate limiting to dashboard API routes (`/api/dashboard/*`) and the MCP endpoint (`/api/mcp`).

**Why:** Once public, these endpoints are exposed. No rate limiting means an attacker can hammer the Turso database.

**Pros:** Prevents abuse, protects database from denial-of-service.

**Cons:** Adds a dependency (rate limiting library or Vercel edge config).

**Context:** Vercel provides edge-level rate limiting via `@vercel/kv` or middleware-based approaches. The MCP endpoint is especially sensitive since each request creates a new MCP server instance.

**Effort:** S (human: ~4 hours / CC: ~10 min)
**Priority:** P2
**Depends on:** Vercel deployment (step 1 of Public MVP plan).

---

## MCP Token Expiry + Rotation

**What:** Add `expires_at` column to `oauth_tokens`, return `expires_in` in token response, implement token refresh flow.

**Why:** Currently MCP tokens never expire. For a public multi-user app, long-lived tokens are a security risk. If a token is leaked, it grants permanent access to a user's learning data.

**Pros:** Standard OAuth security practice. Limits blast radius of token leaks. Forces periodic re-authentication.

**Cons:** Adds complexity to the MCP OAuth flow (refresh token handling). Claude Desktop / Claude.ai must handle token refresh.

**Context:** After Public MVP ships, tokens are SHA-256 hashed and user-scoped, but they live forever. A 30-day default expiry with a refresh flow would match industry standards. The Settings page already has a "regenerate token" button for manual rotation, but automatic expiry adds defense in depth.

**Effort:** S (human: ~4 hours / CC: ~10 min)
**Priority:** P2
**Depends on:** Public MVP Steps 4+5 complete (token hashing + user scoping).
