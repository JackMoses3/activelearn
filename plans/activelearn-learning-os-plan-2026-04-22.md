<!-- /autoplan restore point: /home/assistant/.gstack/projects/JackMoses3-activelearn/main-autoplan-restore-20260422-110410.md -->

# ActiveLearn: Student Learning OS — Implementation Plan

**Source design:** activelearn-learning-os-design-v2-2026-04-21.md
**Branch:** main
**Date:** 2026-04-22
**Status:** UNDER REVIEW (autoplan)

---

## Design Summary

ActiveLearn evolves from a concept-mapping tutoring tool into a Student Learning Operating System. Vision is Approach C (Personal Development OS). First product surface is Approach B (Study Planner + Teacher).

**What exists today:**
- Course ingestion via MCP (import_graph)
- Concept dependency maps with visual graph
- I-Do/We-Do/You-Do tutoring arc via Claude
- FSRS-based mastery tracking (mastery_score, stability, difficulty, next_review)
- Knowledge component capture + misconception tracking
- Session management (start, end, duration, concepts covered)
- Dashboard: course list, concept map, concept panel, sessions tab, setup tab
- Multi-user auth (NextAuth + Google OAuth)
- MCP OAuth flow with SHA-256 token hashing

**What's proposed (Phase 1-3 of design):**

### Phase 1: Student Learning OS Core (partially built)
- Course ingestion and structure ✅
- Concept dependency map ✅
- Interactive tutoring by concept ✅
- Mastery/progress tracking ✅
- Clear next-step guidance (partially — routing hints exist, no planning UI)

### Phase 2: Student Planning Layer (new)
- Assessment awareness (exam dates, assignment deadlines)
- Study scheduling (what to study when)
- Time and workload estimation
- Weekly prioritization
- Revision recommendations

### Phase 3: Student Performance and Reflection Layer (new)
- Readiness indicators (per-assessment confidence)
- Misconception tracking ✅ (exists but no reflection UI)
- Reflection on weak areas
- Stronger critical feedback loops
- Post-assessment learning review

### Phase 4: Broader Development Expansion (deferred)
- Interview prep, career pathways, self-directed learning, professional development

---

## Premises

1. The real problem is not lack of answers — it is lack of structured, durable development in an AI-saturated world.
2. A personal development operating system is a stronger long-term framing than a course-specific tutor.
3. The first credible way to make that vision real is through a student-facing learning and planning product.
4. ActiveLearn should be more directive, structured, and critical than a generic AI assistant.
5. Scope discipline matters: expand by layering outward from a strong student workflow, not by trying to serve every market simultaneously.

---

---

## CEO Review (Phase 1)

### Premise Challenge

| Premise | Verdict | Notes |
|---|---|---|
| 1. Real problem is lack of structured development, not answers | ACCEPTED (unvalidated) | Strong thesis but based on founder intuition, not user research |
| 2. "Personal development OS" is stronger framing than course tutor | ACCEPTED AS VISION | Risk: OS framing invites scope creep. Use internally, not externally yet |
| 3. Student-facing learning + planning is the right first surface | ACCEPTED | Students have tight constraints (exams, GPA) that force good design |
| 4. ActiveLearn should be more directive than a generic AI assistant | ACCEPTED | Already implemented via I-Do/We-Do/You-Do. This is the moat |
| 5. Expand by layering outward from strong student workflow | ACCEPTED | Design correctly identifies Approach B as first surface |

### Implementation Approach: Hybrid (MCP tools + Dashboard visibility)

Follows existing pattern: MCP writes data (Claude reasons about study plans), dashboard reads and displays it. Same architecture as concept map today.

### What Already Exists (Leverage Map)

| Sub-problem | Existing Code | Reuse |
|---|---|---|
| Course structure | courses table, import_graph MCP tool | Full |
| Concept dependencies | prerequisites field, ConceptMap.tsx | Full |
| Tutoring loop | System prompt I-Do/We-Do/You-Do, routing hints | Full |
| Mastery tracking | FSRS fields, mastery_history table | Full |
| Knowledge components | knowledge_components table + MCP tool | Full |
| Misconception tracking | misconceptions table + MCP tool | Full, needs reflection UI |
| Assessment awareness | Nothing | New: schema + MCP tools + UI |
| Study scheduling | next_review field (no scheduling logic) | Partial: extend FSRS |
| Time estimation | Nothing | New |
| Weekly prioritization | Nothing | New: MCP tool + dashboard view |
| Readiness indicators | mastery_score per-concept | Partial: aggregate per-assessment |

### Dream State Delta

```
CURRENT STATE                    THIS PLAN                      12-MONTH IDEAL
─────────────                    ─────────                      ──────────────
Course import → concept map      + Assessment calendar           Full semester planner
Concept-by-concept tutoring      + "What to study today" view    Adaptive daily study plan
FSRS mastery per concept         + Per-assessment readiness      Cross-course priority engine
Passive dashboard                + Active weekly prioritization  Push notifications + nudges
Misconceptions recorded          + Reflection UI + weak areas    Pattern detection across courses
Single-course sessions           + Multi-course awareness        Unified development dashboard
MCP-only interaction             + Dashboard-driven planning     Mobile app + calendar sync
```

### NOT in Scope

| Item | Reason |
|---|---|
| Calendar sync (Google Calendar, iCal) | Phase 4. Dashboard-only scheduling first |
| Push notifications / nudges | Phase 4. Requires mobile or browser push infra |
| Mobile app | Phase 4. Web-first |
| Multi-course cross-prioritization | Phase 4. Single-course planning first |
| Professor-facing dashboards | Phase 4. Student-only for now |
| Grade prediction | Out of scope entirely. Prediction creates wrong incentives |
| Distribution strategy | Important but outside technical plan scope |

### Error & Rescue Registry

| Error Scenario | Likelihood | Impact | Rescue |
|---|---|---|---|
| Students don't want directive feedback | Medium | High | A/B test directive vs gentle tone |
| Assessment dates entered wrong | High | Medium | Allow manual override, show source |
| MCP spec changes break tutoring loop | Low | Critical | Abstract MCP tools behind service layer |
| Zero concepts imported → planning empty | Medium | Medium | Onboarding guard: require import_graph before planning |
| Study plan conflicts with actual schedule | High | Medium | Plans are suggestions, not mandates |

### Failure Modes Registry

| Mode | Trigger | Severity | Mitigation |
|---|---|---|---|
| Ghost product | No distribution, zero users | Critical | Validate with 5 real students before Phase 3 |
| Scope creep via "OS" framing | Phase 4 features bleed into Phase 2 | High | Hard scope boundary at this plan |
| MCP dependency | Anthropic changes spec | Medium | Abstract behind service layer |
| Data accuracy | Wrong assessment dates → wrong plans | Medium | Show provenance, allow manual correction |

### Success Metrics (added by CEO review)

| Metric | Target (90-day) | Kill Criteria |
|---|---|---|
| Weekly active sessions | 10+ per week (across 5 users) | <3 sessions/week after 30 days |
| 7-day retention | >50% | <20% after 60 days |
| Concepts reviewed per user per week | 5+ | <1 after onboarding |

### CEO Dual Voices

**Claude subagent (CEO):** 7 findings. Critical: no user validation, no distribution strategy. High: no success metrics (now addressed), OS framing risk. Medium: MCP dependency, competitive blind spot, open questions unresolved.

**Codex (CEO):** [codex-unavailable — sandbox blocked file reads]

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                            Claude  Codex  Consensus
  ───────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                    PARTIAL  N/A   FLAGGED
  2. Right problem to solve?            YES*     N/A   CONDITIONAL
  3. Scope calibration correct?         YES      N/A   CONFIRMED
  4. Alternatives sufficiently explored? NO      N/A   FLAGGED
  5. Competitive/market risks covered?  NO       N/A   FLAGGED
  6. 6-month trajectory sound?          AT RISK  N/A   FLAGGED
═══════════════════════════════════════════════════════════════
* Right problem, but unvalidated with actual users.
```

### CEO Completion Summary

| Item | Status |
|---|---|
| Premise challenge | Done — 5/5 accepted with conditions |
| Existing code leverage | Done — 6 full reuse, 2 partial, 4 new |
| Dream state diagram | Done |
| Implementation alternatives | Done — Hybrid selected (P1+P5) |
| Error & Rescue Registry | Done — 5 scenarios |
| Failure Modes Registry | Done — 4 modes |
| Success metrics | Added — 3 metrics with kill criteria |
| Scope boundaries | Defined — 7 items deferred |
| Dual voices | Subagent complete, Codex unavailable |

---

## Design Review (Phase 2)

### Dashboard Hierarchy (decided)

1. **`/courses` home** — "What to study today" widget is the FIRST element, above the course grid. Shows prioritized concepts across all courses, sorted by urgency.
2. **Course detail page** — New "Assessments" tab alongside "Map" and "Sessions". Shows assessment timeline + per-assessment readiness.
3. **Course cards** — Readiness chip inline (existing mastery chip pattern).

### Assessment Data Entry (decided)

Follow MCP pattern. Add `save_assessment` MCP tool. Claude ingests syllabus → saves dates via MCP. No manual form in v1. Same interaction model as `import_graph`.

### UI States (all surfaces)

| Surface | Empty | Loading | Error | Partial |
|---|---|---|---|---|
| Study widget | "No assessments yet. Ask Claude to import your syllabus." + CTA | Skeleton, surface-container-low tonal | Inline text, never toast | Shows available data, grays unavailable |
| Assessment tab | "No exams or deadlines. Tell Claude your course schedule." | Skeleton | Inline | Shows entered dates, flags missing |
| Readiness chip | `--` (insufficient data) | Shimmer | Hidden | "~0.72" with low-confidence indicator |
| Misconception reflection | "No misconceptions recorded yet." | Skeleton | Inline | Shows available, "Keep studying for more" |

### Component Specifications

| Component | Pattern | Font/Color | Data Format |
|---|---|---|---|
| Readiness chip | Existing mastery chip | Geist Mono 9px uppercase | Score as `0.72` or `72%` |
| Study priority item | Card, surface-container-lowest | Inter 14px body, Geist Mono label | Concept + course + urgency + est. time |
| Assessment row | List row, no dividers, spacing 0.6rem | Geist Mono date, Inter name | Date + name + course tag + readiness chip |
| Misconception reflection | Extends ConceptPanel section | Inter 13px body | Collapsible "Why this matters" sections |

### Readiness Formula

```
readiness(assessment) = mean(mastery_score) for all concepts tagged to that assessment
```

Naive weighted mean. Sufficient for v1. Can be refined with prerequisite depth weighting later.

### Weekly Prioritization Scope

Single-course in Phase 2. Dashboard "What to study today" widget aggregates across courses but links into single-course study plans. Cross-course prioritization engine is Phase 4.

### Design Dual Voices

**Claude subagent (Design):** 5 findings. Critical: information hierarchy unspecified, missing states. High: data entry model undefined, generic patterns. Medium: three ambiguities (calendar placement, prioritization scope, readiness formula).

**Codex (Design):** [codex-unavailable — sandbox blocked]

```
DESIGN DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                            Claude  Codex  Consensus
  ───────────────────────────────────── ─────── ─────── ─────────
  1. Information hierarchy specified?    NO→FIX  N/A   RESOLVED
  2. Interaction states complete?        NO→FIX  N/A   RESOLVED
  3. User journey smooth?               BREAKS  N/A   RESOLVED
  4. Component specs match design sys?   NO→FIX  N/A   RESOLVED
  5. Responsive/a11y addressed?          NO      N/A   FLAGGED
  6. Ambiguities that cause rework?      3→FIX   N/A   RESOLVED
═══════════════════════════════════════════════════════════════
```

### Design Completion Summary

| Dimension | Score | Notes |
|---|---|---|
| Information hierarchy | 8/10 | Specified after review |
| Interaction states | 8/10 | All 4 surfaces covered |
| User journey | 7/10 | MCP data entry keeps pattern consistent |
| Component specificity | 8/10 | Matched to DESIGN.md tokens |
| Responsive strategy | 4/10 | Not addressed — desktop-first acceptable for v1 |
| Accessibility | 3/10 | Not addressed — flag for implementation |
| Overall | 7/10 | Solid after fixes, responsive/a11y deferred |

---

## Eng Review (Phase 3)

### Schema: New Tables

```sql
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,           -- ISO date (exam/deadline date)
  type TEXT DEFAULT 'exam',     -- exam | assignment | quiz | other
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (course_id, name, date) -- idempotency constraint
);

CREATE TABLE IF NOT EXISTS concept_assessments (
  assessment_id INTEGER NOT NULL,
  concept_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  weight REAL DEFAULT 1.0,      -- relative importance within assessment
  PRIMARY KEY (assessment_id, concept_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id, concept_id) REFERENCES concept_mastery(course_id, concept_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assessments_course_date ON assessments(course_id, date);
CREATE INDEX IF NOT EXISTS idx_concept_assessments_assessment ON concept_assessments(assessment_id);
```

### Architecture: New MCP Tools

**`save_assessment`** — Saves exam/assignment metadata + linked concepts.
```
Input: { course_id, name, date, type?, concept_ids: string[], notes? }
Validation:
  - course_id belongs to authenticated user (existing pattern via getCourseById)
  - date is valid ISO string, not >18 months out
  - each concept_id exists in concept_mastery for this course
  - UPSERT via UNIQUE(course_id, name, date) for idempotency
Output: { ok: true, assessment_id }
```

**`get_study_plan`** — Returns prioritized study recommendations.
```
Input: { course_id? }  -- omit for cross-course
Logic:
  1. Load upcoming assessments (next 30 days) for user's courses
  2. For each assessment, compute readiness = mean(mastery_score) for linked concepts
  3. Compute floor = min(mastery_score) for linked concepts
  4. Priority = (1 - readiness) * urgency_weight(days_until)
  5. Return top 10 items sorted by priority
Output: [{ assessment_name, course_name, date, readiness, floor, days_until,
           weak_concepts: [{ concept_id, mastery_score }] }]
Limit: top 10 items. Capped query. Index-backed.
```

**`delete_assessment`** — Removes an assessment by ID.
```
Input: { course_id, assessment_id }
Validation: course belongs to user, assessment belongs to course
Output: { ok: true }
```

### Architecture Decision: Data Separation

Assessments are **metadata only** (dates + linked concepts). They do NOT mutate `concept_mastery` or `mastery_history`. Mastery is only written by existing tools (`update_concept_status`, `save_state`). This keeps a clean separation between:
- **Evidence** → concept_mastery, mastery_history (written by tutoring tools)
- **Planning** → assessments, concept_assessments (written by planning tools)
- **Derived** → readiness scores (computed at query time from both)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (Next.js)                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Course   │  │ Study Widget │  │ Assessment Tab    │  │
│  │ Grid     │  │ (top of /    │  │ (course detail)   │  │
│  │ +readines│  │  courses)    │  │                   │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                   │              │
│  ┌────▼───────────────▼───────────────────▼──────────┐  │
│  │              /api/dashboard/*                       │  │
│  │   getCourses, getStudyPlan, getAssessments         │  │
│  │   (all queries join courses.user_id = ?)           │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                  │
├───────────────────────┼──────────────────────────────────┤
│                       │  lib/queries.ts                  │
│              ┌────────▼────────┐                         │
│              │    Turso DB     │                         │
│              │  ┌────────────┐ │                         │
│              │  │ courses    │ │                         │
│              │  │ concept_   │ │                         │
│              │  │  mastery   │ │                         │
│              │  │ assessments│ │  ◄── NEW                │
│              │  │ concept_   │ │  ◄── NEW                │
│              │  │  assessmnts│ │                         │
│              │  │ mastery_   │ │                         │
│              │  │  history   │ │                         │
│              │  └────────────┘ │                         │
│              └────────▲────────┘                         │
│                       │                                  │
├───────────────────────┼──────────────────────────────────┤
│           MCP Server (/api/mcp)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │save_assessment│ │get_study_plan│ │delete_assessment │ │
│  │  (writes)     │ │  (reads)     │ │  (deletes)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Existing: start_session, import_graph, save_state,   ││
│  │ load_state, update_concept_status, get_concept,      ││
│  │ end_session, save_knowledge_component,               ││
│  │ record_misconception, list_courses                   ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Bug Fix: Unawaited PRAGMA (existing, now urgent)

`lib/db.ts:18` calls `_client.execute("PRAGMA foreign_keys = ON;")` without `await`. This is a race condition (two things happen at the same time and step on each other) where subsequent queries could execute before the PRAGMA takes effect, allowing FK violations. New tables with FK constraints make this urgent.

**Fix:** `await _client.execute("PRAGMA foreign_keys = ON;")` — requires making `getDb()` async or using an init pattern.

### Readiness Formula (refined)

```
readiness(assessment) = mean(mastery_score for linked concepts)
floor(assessment) = min(mastery_score for linked concepts)

Display: "Readiness: 0.72 (floor: 0.31)"
```

Both values shown. Floor prevents misleading aggregation when one critical concept is weak.

### Test Plan

| Layer | Test | Priority |
|---|---|---|
| **Schema** | FK cascade: delete course → assessments cascade | P0 |
| **Schema** | UNIQUE constraint: duplicate save_assessment upserts cleanly | P0 |
| **Security** | User isolation: user A cannot see user B's assessments | P0 |
| **Security** | save_assessment rejects concept_ids not in course | P0 |
| **MCP tool** | save_assessment with valid input → creates assessment + concept links | P1 |
| **MCP tool** | save_assessment with invalid course_id → error | P1 |
| **MCP tool** | save_assessment with empty concept_ids → error or empty assessment | P1 |
| **MCP tool** | save_assessment with past date → accepted (historical backfill) | P1 |
| **MCP tool** | save_assessment with date >18mo out → rejected | P1 |
| **MCP tool** | get_study_plan returns top 10, sorted by priority | P1 |
| **MCP tool** | get_study_plan with zero assessments → empty array | P1 |
| **MCP tool** | get_study_plan with zero concepts on assessment → readiness N/A | P1 |
| **Query** | Readiness calc with all-zero mastery → returns 0, no division error | P1 |
| **Query** | Readiness calc with single concept → mean = score | P1 |
| **Dashboard** | Study widget renders empty state | P2 |
| **Dashboard** | Assessment tab renders with mixed data | P2 |
| **Integration** | Concurrent update_concept_status + get_study_plan | P2 |
| **Performance** | get_study_plan with 200 concepts, 15 assessments, 5 courses < 500ms | P2 |

### Eng Dual Voices

**Claude subagent (Eng):** 7 findings. Critical: user_id scoping. High: unbounded compute, concept mapping path, test coverage. Medium: unawaited PRAGMA, naive readiness, no date validation.

**Codex (Eng):** 10 findings. Key additions: domain service layer recommendation, append-only evidence model, idempotency, freshness semantics, correction flows, richer junction table.

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                            Claude  Codex  Consensus
  ───────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?                YES*    PARTIAL FLAGGED
  2. Test coverage sufficient?          NO      NO      CONFIRMED
  3. Performance risks addressed?       NO→FIX  NO→FIX  RESOLVED
  4. Security threats covered?          YES     PARTIAL CONFIRMED
  5. Error paths handled?               PARTIAL PARTIAL RESOLVED
  6. Deployment risk manageable?        YES     YES     CONFIRMED
═══════════════════════════════════════════════════════════════
* Codex recommends domain service extraction. Flagged as TASTE DECISION.
```

### Eng Completion Summary

| Item | Status |
|---|---|
| Schema design | Done — 2 new tables with FKs, indexes, idempotency |
| Architecture diagram | Done |
| New MCP tools spec | Done — 3 tools with validation rules |
| Data separation model | Done — metadata vs evidence vs derived |
| Bug fix (PRAGMA) | Identified, fix specified |
| Readiness formula | Refined — mean + floor |
| Test plan | Done — 18 tests across 5 layers |
| Dual voices | Both complete, 1 taste decision surfaced |

---

## DX Review (Phase 3.5)

### Product Type: AI-integrated MCP server

Primary consumer: Claude (AI agent). Secondary: solo developer (Jack).

### TTHW Assessment

| Step | Current | Target |
|---|---|---|
| 1. Sign up (Google OAuth) | 30s | 30s |
| 2. Read Setup tab | 2min | 1min |
| 3. Configure Claude.ai connector | 3-5min | 2min |
| 4. Start first session | 1min | 1min |
| **Total** | **~7min** | **<5min** |

### Critical Finding: System Prompt Gap

The system prompt (`prompts/activelearn-system-prompt.md`) has ZERO mentions of:
- `save_assessment`
- `get_study_plan`
- `delete_assessment`
- `list_assessments`
- `update_assessment`

Without prompt updates, **all new tools are dead code**. Claude will never call them because it doesn't know they exist.

### Required System Prompt Additions

**New command in COMMAND INTERFACE table:**

| Intent | Triggers | Action |
|---|---|---|
| Save assessment | "I have an exam on [date]", "midterm covers [topics]", "add deadline" | Resolve concept_ids via load_state, then call save_assessment |
| Study plan | "what should I study?", "plan my week", "what's most urgent?" | Call get_study_plan, present prioritized list |
| List assessments | "show my exams", "what assessments do I have?" | Call list_assessments |

**New section: ASSESSMENT AND STUDY PLANNING**
- When student mentions an exam/assignment/deadline, confirm details, resolve concept_ids from current course's concept list, call save_assessment
- Before calling save_assessment, load current concepts via load_state to get valid concept_ids
- For "what should I study" intent, call get_study_plan and present as prioritized list with readiness scores and weak concepts
- Never call save_assessment without confirming date and topics with the student first

### Additional MCP Tools (identified by DX review)

**`list_assessments`** — List assessments for a course.
```
Input: { course_id }
Output: [{ id, name, date, type, concept_ids, readiness, floor }]
```

**`update_assessment`** — Update an existing assessment (date, name, concept_ids).
```
Input: { course_id, assessment_id, name?, date?, concept_ids?, notes? }
Validation: same as save_assessment
Output: { ok: true }
```

**Total new MCP tools: 5** (save_assessment, get_study_plan, delete_assessment, list_assessments, update_assessment)

### Error Response Format (new tools)

```json
{
  "error": "invalid_concept_id",
  "detail": "concept_id 'chp3_intro' not found in course 'comp-sci-101'",
  "hint": "call load_state or list_courses to see valid concept_ids"
}
```

All new tools use structured errors with code + detail + hint. Existing tools keep their current format (not in blast radius).

### DX Dual Voices

**Claude subagent (DX):** 5 findings. Critical: system prompt gap (tools are dead code). High: no concept-resolution workflow, no list_assessments, bare error strings. Medium: no update_assessment.

**Codex (DX):** [codex-unavailable — sandbox blocked]

```
DX DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                            Claude  Codex  Consensus
  ───────────────────────────────────── ─────── ─────── ─────────
  1. Getting started < 5 min?           NO      N/A   FLAGGED
  2. API/CLI naming guessable?          YES     N/A   CONFIRMED
  3. Error messages actionable?         NO→FIX  N/A   RESOLVED
  4. Docs findable & complete?          NO→FIX  N/A   RESOLVED
  5. Upgrade path safe?                 YES     N/A   CONFIRMED
  6. Dev environment friction-free?     YES     N/A   CONFIRMED
═══════════════════════════════════════════════════════════════
```

### DX Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Getting started (TTHW) | 5/10 | 7min, target <5min. Setup tab could streamline |
| Tool naming | 8/10 | save/get/list/update/delete — standard CRUD verbs |
| Error messages | 7/10 | Structured format specified for new tools |
| Documentation | 6/10 | System prompt additions specified but not yet written |
| Escape hatches | 7/10 | update_assessment + delete_assessment cover corrections |
| Dev environment | 8/10 | Standard Next.js, no special setup |
| Upgrade path | 7/10 | Migration script pattern established |
| API consistency | 7/10 | Follows existing MCP tool patterns |
| **Overall** | **7/10** | Good after fixes, TTHW and docs need work |

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | Hybrid approach (MCP + Dashboard) | Mechanical | P1+P5 | Follows existing pattern, most complete | MCP-only (no visibility), Dashboard-only (no intelligence) |
| 2 | CEO | Accept problem framing, require validation | Mechanical | P6 | Bias toward action, but flag the unvalidated premise | Block until validated (too slow) |
| 3 | CEO | Add competitive positioning as pre-impl artifact | Mechanical | P1 | Completeness — plan needs to articulate differentiation | Skip (leaves blind spot) |
| 4 | CEO | Distribution strategy flagged as taste decision | Taste | P3 | Important but outside technical plan scope | Auto-include (scope creep) |
| 5 | CEO | Add success metrics with 90-day kill gate | Mechanical | P1 | Plan without metrics drifts indefinitely | Skip metrics (no accountability) |
| 6 | Design | Dashboard hierarchy: study widget first, assessments tab on course detail | Mechanical | P5+P1 | Explicit placement, completeness | Leave ambiguous (causes rework) |
| 7 | Design | Assessment data via MCP tool, not manual form | Mechanical | P4+P5 | Reuses existing MCP pattern, DRY | Manual form (breaks interaction model) |
| 8 | Design | All UI states specified for 4 surfaces | Mechanical | P1 | Completeness — empty state is first-run experience | Leave to implementer (sloppy) |
| 9 | Design | Component specs matched to DESIGN.md tokens | Mechanical | P5 | Explicit, follows existing system | Generic descriptions (visual drift) |
| 10 | Design | Weekly prioritization: single-course Phase 2, cross-course Phase 4 | Mechanical | P5+P3 | Resolves contradiction, pragmatic | Cross-course now (scope creep) |
| 11 | Design | Readiness formula: simple mean of mastery_score | Mechanical | P5+P3 | Explicit, naive but correct to start | Complex weighted formula (premature) |
| 12 | Eng | All assessment queries join courses.user_id | Mechanical | P1+P5 | Same pattern as every table, prevents data leak | Skip (security hole) |
| 13 | Eng | get_study_plan capped at top 10, index-backed | Mechanical | P3+P5 | Prevents unbounded compute | Unlimited (perf risk) |
| 14 | Eng | save_assessment requires explicit concept_ids, validates each | Mechanical | P5 | No fuzzy matching in tool, Claude maps before calling | Implicit matching (fragile) |
| 15 | Eng | Fix unawaited PRAGMA foreign_keys in db.ts | Mechanical | P1 | Existing bug, new FKs make it urgent | Ignore (FK violations) |
| 16 | Eng | Readiness = mean + floor indicator | Mechanical | P5+P3 | Honest display, prevents misleading aggregation | Mean only (misleading) |
| 17 | Eng | Date validation: ISO string, <18mo out, past OK | Mechanical | P1 | Completeness | No validation (corrupt data) |
| 18 | Eng | Domain service layer vs MCP-inline | Taste | P5 vs P3 | Codex recommends extraction, current pattern is inline | See taste decision at gate |
| 19 | Eng | Assessments are metadata only, don't mutate mastery | Mechanical | P5+P4 | Clean separation of concerns | Mixed writes (race conditions) |
| 20 | Eng | Idempotency via UNIQUE(course_id, name, date) + upsert | Mechanical | P1 | MCP retries, Vercel retries, users double-submit | No constraint (duplicates) |
| 21 | Eng | Assessment correction via upsert, hard delete via tool | Mechanical | P3+P5 | Pragmatic for v1 | Soft delete (premature complexity) |
| 22 | DX | Add system prompt section for planning tools | Mechanical | P1 | Without this, tools are dead code | Skip prompt update (tools never called) |
| 23 | DX | Add list_assessments MCP tool | Mechanical | P1+P5 | Required for delete/update flows and discovery | Omit (broken workflow) |
| 24 | DX | Add update_assessment MCP tool | Mechanical | P1 | Plan's own error registry flags wrong dates as high risk | Omit (no correction path) |
| 25 | DX | Structured error responses: code + detail + hint | Mechanical | P1+P5 | Explicit, helps Claude recover from errors | Bare strings (no debugging info) |
| 26 | DX | Document concept-resolution in system prompt | Mechanical | P5 | Claude needs to know how to map topics to IDs | Omit (save_assessment fails silently) |

---

## Cross-Phase Themes

**Theme 1: Documentation gap** — Flagged in Phase 1 (design doc open questions), Phase 2 (component specs missing), Phase 3.5 (system prompt has zero mention of new tools). The plan's biggest risk is shipping tools nobody can discover or use.

**Theme 2: Validation gap** — Flagged in Phase 1 (no user validation of demand), Phase 3 (no input validation on tools), Phase 3.5 (no concept-resolution workflow). Validation is needed at every layer: demand (interviews), data (Zod schemas), workflow (system prompt).

---

## Implementation Sequence

### Step 1: Schema Migration (~15 min CC)
- Add assessments and concept_assessments tables
- Add indexes
- Fix unawaited PRAGMA in lib/db.ts
- Write migration script (scripts/migrate-v3.ts)

### Step 2: MCP Tools (~30 min CC)
- save_assessment with Zod validation + upsert
- list_assessments with readiness computation
- get_study_plan with priority algorithm (top 10, index-backed)
- update_assessment via upsert
- delete_assessment with ownership check
- Structured error responses on all new tools

### Step 3: Dashboard API Routes (~15 min CC)
- GET /api/dashboard/courses/[id]/assessments
- GET /api/dashboard/study-plan (cross-course for user)
- Add readiness to existing course stats query

### Step 4: Dashboard UI (~30 min CC)
- "What to study today" widget on /courses (above course grid)
- Readiness chips on course cards
- "Assessments" tab on course detail page
- Misconception reflection section in ConceptPanel
- All empty/loading/error states per design spec

### Step 5: System Prompt Update (~15 min CC)
- Add ASSESSMENT AND STUDY PLANNING section
- Add new commands to COMMAND INTERFACE table
- Add concept-resolution workflow docs
- Update setup page TOOLS array

### Step 6: Tests (~20 min CC)
- P0: FK cascade, UNIQUE constraint, user isolation, concept validation
- P1: MCP tool happy/error paths, readiness calculation
- P2: Dashboard rendering, integration, performance

### Step 7: Pre-implementation Artifacts
- Competitive positioning paragraph
- 5 user interviews scheduled (validation gate before Phase 3)

**Estimated total: ~2-3 hours CC time across 2-3 sessions.**

---

## Plan Status

**Status:** APPROVED
**Reviews completed:** CEO, Design, Eng, DX
**Decisions:** 26 total (24 auto-decided, 2 taste decisions — both accepted as recommended)
**Approved:** 2026-04-22

## GSTACK REVIEW REPORT

| Review | Status | Findings | Unresolved | Verdict |
|---|---|---|---|---|
| CEO Review | PASS | 7 | 0 | Premises accepted, metrics + positioning added |
| Design Review | PASS | 5 | 1 (responsive/a11y deferred) | 7/10, hierarchy + states resolved |
| Eng Review | PASS | 17 | 0 | Schema, tools, tests specified |
| DX Review | PASS | 5 | 1 (TTHW 7→5min) | 7/10, prompt gap critical fix included |
| CEO Voices | subagent-only | 1/6 confirmed | — | Codex sandbox blocked |
| Eng Voices | codex+subagent | 4/6 confirmed | — | Full dual review |
| Design Voices | subagent-only | 4/6 resolved | — | Codex sandbox blocked |
| DX Voices | subagent-only | 3/6 confirmed | — | Codex sandbox blocked |
