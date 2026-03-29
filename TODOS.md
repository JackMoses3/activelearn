# TODOS

## Error Boundary — Dashboard Layout DB Fetch

**What:** Wrap `getCourses()` in `layout.tsx` in a try/catch and pass an empty array to SideNav on failure.

**Why:** If the DB is unavailable at render time, the entire dashboard returns a 500. With a graceful fallback, the sidebar is empty but the page still loads.

**Pros:** Zero-cost resilience. No visible impact under normal conditions.

**Cons:** None meaningful.

**Context:** `getCourses()` runs server-side in `app/(dashboard)/layout.tsx:6`. Next.js does not automatically catch thrown promises in async server components — an unhandled throw here surfaces as a 500. Fix is a 3-line try/catch with fallback to `[]`.

**Depends on:** Nothing.
