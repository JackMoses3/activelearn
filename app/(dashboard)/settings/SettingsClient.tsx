"use client";

import { useState, useTransition } from "react";
import { deleteAccount, signOutAction } from "./actions";

const MONO: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };
const SERIF: React.CSSProperties = { fontFamily: "'Fraunces', serif" };

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
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

export function SettingsClient({ user }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
    });
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
