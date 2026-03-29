"use client";

import { useState } from "react";

export function CopyPromptButton() {
  const [state, setState] = useState<"idle" | "copying" | "copied">("idle");

  async function handleCopy() {
    setState("copying");
    try {
      const res = await fetch("/api/system-prompt");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={state === "copying"}
      className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[16px] leading-none">
        {state === "copied" ? "check" : "content_copy"}
      </span>
      {state === "copied" ? "Copied!" : state === "copying" ? "Copying…" : "Copy System Prompt"}
    </button>
  );
}
