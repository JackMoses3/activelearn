"use client";

import { useState, useTransition } from "react";
import { regenerateToken, deleteAccount, signOutAction } from "./actions";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };
const SERIF: React.CSSProperties = { fontFamily: "'Fraunces', serif" };

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://activelearn.vercel.app";

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  hasToken: boolean;
  tokenCreatedAt: string | null;
}

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

export function SettingsClient({ user, hasToken, tokenCreatedAt }: Props) {
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState<"token" | "config" | null>(null);
  const [isPending, startTransition] = useTransition();

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        activelearn: {
          url: `${BASE}/api/mcp`,
          headers: {
            Authorization: `Bearer ${newToken ?? "YOUR_TOKEN_HERE"}`,
          },
        },
      },
    },
    null,
    2
  );

  async function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateToken();
      if ("rawToken" in result) {
        setNewToken(result.rawToken);
      }
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
    });
  }

  function copyToClipboard(text: string, which: "token" | "config") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-10">
      {/* Page title */}
      <h1
        className="text-[28px] font-bold tracking-tight text-primary"
        style={{ ...SERIF, letterSpacing: "-0.02em" }}
      >
        Settings
      </h1>

      {/* Profile Section */}
      <section className="bg-surface-container-lowest rounded-lg p-6" style={{ boxShadow: "0 2px 16px rgba(27,28,23,0.05)" }}>
        <SectionLabel>Profile</SectionLabel>
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-on-surface-variant"
              style={{ background: "#eae8e0" }}
            >
              {(user.name?.[0] ?? user.email[0]).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-[14px] font-medium text-primary">
              {user.name ?? "No name set"}
            </p>
            <p className="text-[13px] text-on-surface-variant">{user.email}</p>
          </div>
        </div>
      </section>

      {/* MCP Connection Section */}
      <section className="bg-surface-container-lowest rounded-lg p-6" style={{ boxShadow: "0 2px 16px rgba(27,28,23,0.05)" }}>
        <SectionLabel>MCP Connection</SectionLabel>

        {/* Token status */}
        <div className="mb-4">
          {newToken ? (
            <div className="space-y-2">
              <p className="text-[13px] text-on-surface-variant">
                New token generated. Copy it now, it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-[11px] bg-surface-container-high rounded px-3 py-2 text-primary break-all"
                  style={MONO}
                >
                  {newToken}
                </code>
                <button
                  onClick={() => copyToClipboard(newToken, "token")}
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary hover:opacity-80 transition-opacity px-3 py-2"
                  style={MONO}
                >
                  {copied === "token" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : hasToken ? (
            <p className="text-[13px] text-on-surface-variant">
              Token active
              {tokenCreatedAt && (
                <span className="text-on-surface-variant/50">
                  {" "}· created {new Date(tokenCreatedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          ) : (
            <p className="text-[13px] text-on-surface-variant">
              No MCP token configured. Generate one to connect Claude.
            </p>
          )}
        </div>

        <button
          onClick={handleRegenerate}
          disabled={isPending}
          className="bg-primary text-on-primary py-2 px-4 rounded-md text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {hasToken && !newToken ? "Regenerate Token" : "Generate Token"}
        </button>

        {/* Config block */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/60" style={MONO}>
              Claude Desktop Config
            </span>
            <button
              onClick={() => copyToClipboard(mcpConfig, "config")}
              className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary hover:opacity-80 transition-opacity"
              style={MONO}
            >
              {copied === "config" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="text-[11px] bg-primary text-on-primary rounded-md px-4 py-3 overflow-x-auto"
            style={MONO}
          >
            {mcpConfig}
          </pre>
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-surface-container-lowest rounded-lg p-6" style={{ boxShadow: "0 2px 16px rgba(27,28,23,0.05)" }}>
        <SectionLabel>Account</SectionLabel>
        <div className="flex items-center gap-3">
          <button
            onClick={() => startTransition(() => signOutAction())}
            disabled={isPending}
            className="bg-surface-container-lowest text-primary py-2 px-4 rounded-md text-[13px] font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50"
            style={{ boxShadow: "0 1px 3px rgba(27,28,23,0.12)" }}
          >
            Sign Out
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[13px] font-semibold text-error hover:opacity-80 transition-opacity px-4 py-2"
            >
              Delete Account
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-error">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="bg-error text-on-primary py-1.5 px-3 rounded-md text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[12px] text-on-surface-variant hover:text-primary transition-colors px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
