"use client";

import { useState } from "react";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };
const SERIF: React.CSSProperties = { fontFamily: "'Fraunces', serif" };

const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://activelearn.vercel.app";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/60 mb-4"
      style={MONO}
    >
      {children}
    </h3>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold shrink-0"
      style={MONO}
    >
      {n}
    </span>
  );
}

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary hover:opacity-80 transition-opacity px-3 py-1.5"
      style={MONO}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

const TOOLS = [
  {
    name: "start_session",
    trigger: '"teach me [course]", "let\'s study [course]"',
    description:
      "Starts a learning session for a course. Creates the course if new. Returns mastery state, routing, and observed misconceptions.",
  },
  {
    name: "import_graph",
    trigger: '"map this", "extract from these notes", "build the graph"',
    description:
      "Bulk-imports a concept graph from uploaded materials. Extracts concepts, prerequisites, and relationships into a DAG.",
  },
  {
    name: "list_courses",
    trigger: '"show my courses", "what courses do I have?"',
    description: "Lists all courses with concept counts and session stats.",
  },
  {
    name: "get_concept",
    trigger: '"show my progress", "how am I doing?"',
    description:
      "Gets mastery data for a single concept including status, score, and review schedule.",
  },
  {
    name: "update_concept_status",
    trigger: "Used automatically during teaching sessions",
    description:
      "Updates a concept's mastery status (not_started, learning, learned, mastered) and FSRS score after teaching.",
  },
  {
    name: "save_state",
    trigger: "Used automatically when session ends",
    description:
      "Saves the full mastery state JSON for a course. Called during end_session.",
  },
  {
    name: "load_state",
    trigger: "Used automatically at session start",
    description:
      "Loads the current mastery state for a course. Called during start_session.",
  },
  {
    name: "end_session",
    trigger: '"end session", "goodbye", "wrap up", "I\'m done"',
    description:
      "Ends the current session, records which concepts were covered, and saves state.",
  },
  {
    name: "save_knowledge_component",
    trigger: "Used automatically during teaching",
    description:
      "Records a learning insight or key understanding the student demonstrated during a session.",
  },
  {
    name: "record_misconception",
    trigger: "Used automatically during teaching",
    description:
      "Records an observed misconception. These are tracked per-concept and probed in future review sessions.",
  },
];

const COMMANDS = [
  {
    intent: "Map this",
    triggers: '"map this", "extract from these notes", "build the graph"',
    action: "Extract concept DAG from uploaded materials",
  },
  {
    intent: "Teach me",
    triggers: '"teach me [X]", "let\'s cover [X]", "I want to learn [X]"',
    action: "Socratic teaching session for a concept",
  },
  {
    intent: "Review",
    triggers: '"review", "what should I study?", "what\'s due?"',
    action: "FSRS-based review of overdue concepts",
  },
  {
    intent: "Progress",
    triggers: '"show my progress", "how am I doing?"',
    action: "ASCII progress report",
  },
  {
    intent: "Unlocked",
    triggers: '"what can I learn next?", "what\'s newly unlocked?"',
    action: "List concepts with all prereqs satisfied",
  },
  {
    intent: "End session",
    triggers: '"end session", "goodbye", "wrap up", "I\'m done"',
    action: "Save state and close session",
  },
];

export default function SetupPage() {
  const [promptCopied, setPromptCopied] = useState(false);

  async function copySystemPrompt() {
    try {
      const res = await fetch("/api/system-prompt");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      // Clipboard API or fetch may fail
    }
  }

  return (
    <div className="p-10 max-w-2xl space-y-10">
      <h1
        className="text-[28px] font-bold tracking-tight text-primary"
        style={{ ...SERIF, letterSpacing: "-0.02em" }}
      >
        Setup Guide
      </h1>

      <p className="text-[14px] text-on-surface-variant leading-relaxed">
        Connect ActiveLearn to Claude in three steps. Once connected, Claude
        becomes your Socratic tutor with persistent memory of what you know.
      </p>

      {/* Step 1: Custom Connector */}
      <section
        className="bg-surface-container-lowest rounded-lg p-6"
        style={{ boxShadow: "0 2px 16px rgba(27,28,23,0.05)" }}
      >
        <SectionLabel>Step 1</SectionLabel>
        <div className="flex items-start gap-3 mb-4">
          <StepNumber n={1} />
          <div>
            <h2 className="text-[16px] font-semibold text-primary mb-1">
              Create a Custom Connector
            </h2>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              This tells Claude.ai how to reach your ActiveLearn server.
            </p>
          </div>
        </div>

        <ol className="space-y-3 ml-9 text-[13px] text-on-surface-variant leading-relaxed">
          <li>
            Go to{" "}
            <strong className="text-primary">claude.ai</strong> and sign in
          </li>
          <li>
            Click your profile icon →{" "}
            <strong className="text-primary">Settings</strong> →{" "}
            <strong className="text-primary">Customize</strong>
          </li>
          <li>
            Scroll to{" "}
            <strong className="text-primary">Connectors</strong> and click{" "}
            <strong className="text-primary">+</strong>
          </li>
          <li>
            Name it{" "}
            <code
              className="text-[11px] bg-surface-container rounded px-1.5 py-0.5 text-primary"
              style={MONO}
            >
              ActiveLearn
            </code>
          </li>
          <li>
            Paste this URL:
            <div className="flex items-center gap-2 mt-2">
              <code
                className="flex-1 text-[11px] bg-primary text-on-primary rounded px-3 py-2 break-all"
                style={MONO}
              >
                {BASE}/api/mcp
              </code>
              <CopyButton text={`${BASE}/api/mcp`} />
            </div>
          </li>
          <li>
            Click <strong className="text-primary">Save</strong>. You will be
            redirected to sign in with Google or GitHub to authorize the
            connection.
          </li>
        </ol>
      </section>

      {/* Step 2: Claude Project + System Prompt */}
      <section
        className="bg-surface-container-lowest rounded-lg p-6"
        style={{ boxShadow: "0 2px 16px rgba(27,28,23,0.05)" }}
      >
        <SectionLabel>Step 2</SectionLabel>
        <div className="flex items-start gap-3 mb-4">
          <StepNumber n={2} />
          <div>
            <h2 className="text-[16px] font-semibold text-primary mb-1">
              Create a Claude Project
            </h2>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              The system prompt tells Claude how to be your Socratic tutor.
            </p>
          </div>
        </div>

        <ol className="space-y-3 ml-9 text-[13px] text-on-surface-variant leading-relaxed">
          <li>
            In Claude.ai, click{" "}
            <strong className="text-primary">Projects</strong> in the sidebar →{" "}
            <strong className="text-primary">Create Project</strong>
          </li>
          <li>
            Name it something like{" "}
            <code
              className="text-[11px] bg-surface-container rounded px-1.5 py-0.5 text-primary"
              style={MONO}
            >
              ActiveLearn Tutor
            </code>
          </li>
          <li>
            Open{" "}
            <strong className="text-primary">Custom Instructions</strong> and
            paste the system prompt below
          </li>
        </ol>

        <div className="mt-5 ml-9">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/60"
              style={MONO}
            >
              System Prompt
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={copySystemPrompt}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary hover:opacity-80 transition-opacity px-3 py-1.5"
                style={MONO}
              >
                {promptCopied ? "Copied" : "Copy"}
              </button>
              <a
                href="/api/system-prompt?download=1"
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary hover:opacity-80 transition-opacity px-3 py-1.5"
                style={MONO}
              >
                Download
              </a>
            </div>
          </div>
          <div
            className="bg-primary text-on-primary rounded-md px-4 py-3 text-[11px] leading-relaxed max-h-32 overflow-y-auto"
            style={MONO}
          >
            The system prompt is ~300 lines. Click Copy to copy it to your
            clipboard, or Download to save as a .txt file.
          </div>
        </div>
      </section>

      {/* Step 3: Command & Tool Reference */}
      <section
        className="bg-surface-container-lowest rounded-lg p-6"
        style={{ boxShadow: "0 2px 16px rgba(27,28,23,0.05)" }}
      >
        <SectionLabel>Step 3</SectionLabel>
        <div className="flex items-start gap-3 mb-4">
          <StepNumber n={3} />
          <div>
            <h2 className="text-[16px] font-semibold text-primary mb-1">
              Start Learning
            </h2>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              Open a chat in your project and use these natural language
              commands. Claude handles the rest.
            </p>
          </div>
        </div>

        {/* Command Reference */}
        <div className="ml-9 mb-8">
          <h4
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/60 mb-3"
            style={MONO}
          >
            Commands
          </h4>
          <div className="space-y-2">
            {COMMANDS.map((cmd) => (
              <div
                key={cmd.intent}
                className="bg-surface-container rounded-md px-4 py-3"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-primary">
                    {cmd.intent}
                  </span>
                  <span className="text-[11px] text-on-surface-variant/60">
                    {cmd.action}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant" style={MONO}>
                  {cmd.triggers}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MCP Tool Reference */}
        <div className="ml-9">
          <h4
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/60 mb-3"
            style={MONO}
          >
            MCP Tools (under the hood)
          </h4>
          <p className="text-[13px] text-on-surface-variant mb-3 leading-relaxed">
            These tools run automatically. You don&apos;t call them directly,
            Claude uses them behind the scenes to track your learning.
          </p>
          <div className="space-y-2">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="bg-surface-container rounded-md px-4 py-3"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <code
                    className="text-[11px] text-secondary font-semibold"
                    style={MONO}
                  >
                    {tool.name}
                  </code>
                  <span className="text-[11px] text-on-surface-variant/50 italic">
                    {tool.trigger}
                  </span>
                </div>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
