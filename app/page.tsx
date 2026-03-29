import { auth } from "@/auth";
import { readFileSync } from "fs";
import Link from "next/link";
import { join } from "path";
import { CopyPromptButton } from "./CopyPromptButton";

function getPromptPreview(): string {
  try {
    const raw = readFileSync(
      join(process.cwd(), "prompts/activelearn-system-prompt.md"),
      "utf-8",
    );
    const lines = raw.split("\n");
    const separatorIdx = lines.findIndex((l) => l.startsWith("# ─"));
    const content = (separatorIdx >= 0 ? lines.slice(separatorIdx + 1) : lines)
      .join("\n")
      .trimStart();
    return content.slice(0, 480).trimEnd() + "…";
  } catch {
    return "";
  }
}

// ── Concept map SVG (hero background) ──────────────────────────────────────

function ConceptMapBackground() {
  // Nodes: [x, y, label, state]
  type NodeState = "mastered" | "partial" | "live" | "unseen";
  const nodes: [number, number, string, NodeState][] = [
    [50, 90, "variables", "mastered"],
    [230, 50, "scope", "mastered"],
    [420, 30, "functions", "mastered"],
    [630, 70, "closures", "partial"],
    [90, 210, "mutation", "partial"],
    [280, 200, "references", "partial"],
    [480, 190, "decorators", "live"],
    [700, 180, "iteration", "partial"],
    [140, 350, "generators", "unseen"],
    [360, 340, "async / await", "unseen"],
    [580, 350, "protocols", "unseen"],
  ];

  // node center = (x + 65, y + 21)  (node w=130, h=42)
  const cx = (x: number) => x + 65;
  const cy = (y: number) => y + 21;

  const edges: [number, number, number, number][] = [
    [cx(50), cy(90), cx(230), cy(50)], // vars→scope
    [cx(50), cy(90), cx(90), cy(210)], // vars→mutation
    [cx(50), cy(90), cx(280), cy(200)], // vars→refs
    [cx(230), cy(50), cx(420), cy(30)], // scope→funcs
    [cx(230), cy(50), cx(280), cy(200)], // scope→refs
    [cx(420), cy(30), cx(630), cy(70)], // funcs→closures
    [cx(420), cy(30), cx(480), cy(190)], // funcs→decorators
    [cx(420), cy(30), cx(700), cy(180)], // funcs→iteration
    [cx(90), cy(210), cx(280), cy(200)], // mutation→refs
    [cx(280), cy(200), cx(480), cy(190)], // refs→decorators
    [cx(630), cy(70), cx(480), cy(190)], // closures→decorators
    [cx(480), cy(190), cx(360), cy(340)], // decorators→async
    [cx(700), cy(180), cx(140), cy(350)], // iteration→generators
    [cx(480), cy(190), cx(580), cy(350)], // decorators→protocols
    [cx(360), cy(340), cx(580), cy(350)], // async→protocols
  ];

  return (
    <svg
      viewBox="0 0 860 420"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="live-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Edges */}
      {edges.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#807572"
          strokeWidth="1"
          strokeOpacity="0.4"
          markerEnd="none"
        />
      ))}

      {/* Nodes */}
      {nodes.map(([x, y, label, state]) => {
        const isMastered = state === "mastered";
        const isPartial = state === "partial";
        const isLive = state === "live";

        return (
          <g key={label} transform={`translate(${x}, ${y})`}>
            {isLive && (
              <rect
                x="-3"
                y="-3"
                width="136"
                height="48"
                rx="7"
                fill="none"
                stroke="rgba(0,255,148,0.35)"
                strokeWidth="6"
                filter="url(#live-glow)"
              />
            )}
            <rect
              width="130"
              height="42"
              rx="6"
              fill={isMastered ? "#2b2220" : "#ffffff"}
              stroke={
                isMastered
                  ? "none"
                  : isPartial
                    ? "#5b4ac8"
                    : isLive
                      ? "rgba(0,255,148,0.7)"
                      : "rgba(128,117,114,0.35)"
              }
              strokeWidth={isMastered ? 0 : 1.5}
              strokeDasharray={state === "unseen" ? "4 3" : undefined}
            />
            {isLive && <circle cx="118" cy="10" r="4" fill="#00ff94" />}
            <text
              x="65"
              y="26"
              textAnchor="middle"
              fontSize="10"
              fontFamily="'Geist Mono', monospace"
              fontWeight="600"
              fill={
                isMastered
                  ? "#ffffff"
                  : isPartial
                    ? "#5b4ac8"
                    : isLive
                      ? "#1b1c17"
                      : "#807572"
              }
              letterSpacing="0.05em"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Connector URL ──────────────────────────────────────────────────────────

const CONNECTOR_URL = "https://activelearn.vercel.app/api/mcp";

// ── Page ────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const promptPreview = getPromptPreview();

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 h-14 flex items-center justify-between px-8"
        style={{
          borderBottom: "1px solid rgba(209,195,193,0.2)",
          background: "rgba(251,249,241,0.92)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          className="text-[17px] font-bold text-primary tracking-tight"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          ActiveLearn
        </span>
        <div className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70 hover:text-primary transition-colors"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            How It Works
          </a>
          <a
            href="#system-prompt"
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70 hover:text-primary transition-colors"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            System Prompt
          </a>
          {isAuthenticated ? (
            <Link
              href="/courses"
              className="bg-primary text-on-primary px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] hover:opacity-90 transition-opacity"
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              Go to Courses →
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-primary text-on-primary px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] hover:opacity-90 transition-opacity"
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        {/* Concept map background — right portion only */}
        <div className="absolute right-0 inset-y-0 w-[68%] opacity-[0.18]">
          <ConceptMapBackground />
        </div>
        {/* Gradient fade so left text area is fully readable */}
        <div
          className="absolute inset-0 z-1 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, #fbf9f1 42%, rgba(251,249,241,0.88) 62%, transparent 82%)",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 px-16 py-24 max-w-3xl">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary mb-4"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            MCP-Connected Learning
          </p>

          <h1
            className="text-[56px] leading-[1.04] tracking-[-0.025em] text-primary mb-6"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
          >
            Learn it until
            <br />
            <em
              className="text-on-surface-variant"
              style={{ fontStyle: "italic", fontWeight: 300 }}
            >
              you can teach it.
            </em>
          </h1>

          <p className="text-[15px] leading-relaxed text-on-surface-variant max-w-xl mb-10">
            ActiveLearn connects to Claude. Every session, Claude tracks what
            you know, fills the gaps, and schedules review — automatically. Your
            knowledge graph grows with every conversation.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/courses"
                className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(180deg, #2b2220, #413735)",
                }}
              >
                <span className="material-symbols-outlined text-[16px] leading-none">
                  school
                </span>
                Go to your courses
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(180deg, #2b2220, #413735)",
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className="w-4 h-4 fill-current"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Sign in with GitHub
              </Link>
            )}
            <a
              href="#system-prompt"
              className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold text-primary border transition-colors hover:bg-surface-container-low"
              style={{ borderColor: "rgba(209,195,193,0.4)" }}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                download
              </span>
              Download System Prompt
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-24 px-16"
        style={{
          background: "#f6f4ec",
          borderTop: "1px solid rgba(209,195,193,0.2)",
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant/50 mb-10"
          style={{ fontFamily: "'Geist Mono', monospace" }}
        >
          Setup
        </p>
        <h2
          className="text-[32px] font-bold tracking-tight text-primary mb-16 leading-tight"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Three steps to a smarter
          <br />
          <em style={{ fontStyle: "italic", fontWeight: 300 }}>
            knowledge graph.
          </em>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Step 1 */}
          <div className="flex flex-col gap-4">
            <span
              className="text-[72px] leading-none text-outline-variant/40 font-light"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
            >
              01
            </span>
            <h3 className="text-base font-bold text-primary">
              Add the ActiveLearn connector
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              In Claude.ai, go to <strong>Customize → Connectors</strong>, click{" "}
              <strong>+</strong>, and add a Custom connector named{" "}
              <strong>ActiveLearn</strong>.
            </p>
            <div
              className="rounded-md p-4 mt-2 text-[11px] leading-relaxed overflow-x-auto flex flex-col gap-2"
              style={{
                background: "#2b2220",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              <div style={{ color: "#d3c3c0" }}>
                <span style={{ color: "#807572" }}>Name&nbsp;&nbsp;</span>
                <span style={{ color: "#ffffff" }}>ActiveLearn</span>
              </div>
              <div style={{ color: "#d3c3c0" }}>
                <span style={{ color: "#807572" }}>URL&nbsp;&nbsp;&nbsp;</span>
                <span style={{ color: "#00ff94" }}>{CONNECTOR_URL}</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col gap-4">
            <span
              className="text-[72px] leading-none text-outline-variant/40 font-light"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
            >
              02
            </span>
            <h3 className="text-base font-bold text-primary">
              Load the system prompt
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Copy the system prompt into your Claude Project&apos;s custom
              instructions. This is what transforms Claude into an active
              learning teacher.
            </p>
            <div className="mt-2">
              <CopyPromptButton />
            </div>
            <p
              className="text-[10px] text-on-surface-variant/50 mt-1"
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              Or{" "}
              <a
                href="/api/system-prompt?download=1"
                className="underline hover:text-on-surface-variant transition-colors"
              >
                download as .txt
              </a>
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col gap-4">
            <span
              className="text-[72px] leading-none text-outline-variant/40 font-light"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
            >
              03
            </span>
            <h3 className="text-base font-bold text-primary">
              Start a session with Claude
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Claude will ask which course you&apos;re studying, load your
              knowledge state, and begin teaching using the I-Do / We-Do /
              You-Do arc — no passive reading, all retrieval.
            </p>
            <div
              className="mt-2 flex flex-col gap-2 text-[11px] text-on-surface-variant/70"
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/60 shrink-0" />
                I-Do — Claude explains, you absorb
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/60 shrink-0" />
                We-Do — guided questions, ~80% success rate
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/60 shrink-0" />
                You-Do — Socratic probing, teach-back
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── System Prompt ─────────────────────────────────────────────────── */}
      <section
        id="system-prompt"
        className="py-24 px-16"
        style={{ borderTop: "1px solid rgba(209,195,193,0.2)" }}
      >
        <div className="max-w-3xl">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant/50 mb-6"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            System Prompt
          </p>
          <h2
            className="text-[28px] font-bold tracking-tight text-primary mb-3 leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            No account required to evaluate it.
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
            The system prompt is the full instructional layer that makes Claude
            an active learning teacher. Read it before you commit. It&apos;s
            free to use and modify.
          </p>

          {promptPreview && (
            <div
              className="rounded-lg p-6 mb-6 text-[12px] leading-relaxed text-on-surface-variant/80 overflow-hidden relative"
              style={{
                background: "#f6f4ec",
                border: "1px solid rgba(209,195,193,0.3)",
                fontFamily: "'Geist Mono', monospace",
                whiteSpace: "pre-wrap",
                maxHeight: "240px",
              }}
            >
              {promptPreview}
              <div
                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, #f6f4ec)",
                }}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <CopyPromptButton />
            <a
              href="/api/system-prompt?download=1"
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-primary border transition-colors hover:bg-surface-container-low"
              style={{ borderColor: "rgba(209,195,193,0.4)" }}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                download
              </span>
              Download .txt
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-16 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(209,195,193,0.2)" }}
      >
        <span
          className="text-[14px] font-bold text-primary/40 tracking-tight"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          ActiveLearn
        </span>
        <span
          className="text-[10px] text-on-surface-variant/30 uppercase tracking-[0.1em]"
          style={{ fontFamily: "'Geist Mono', monospace" }}
        >
          MCP-Connected · Spaced Repetition · Concept Mapping
        </span>
        {isAuthenticated ? (
          <Link
            href="/courses"
            className="text-[11px] text-on-surface-variant/50 hover:text-primary transition-colors"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            Dashboard →
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-[11px] text-on-surface-variant/50 hover:text-primary transition-colors"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            Sign In →
          </Link>
        )}
      </footer>
    </div>
  );
}
