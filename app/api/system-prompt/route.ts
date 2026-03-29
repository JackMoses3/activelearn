import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

function getPromptText(): string {
  const raw = readFileSync(join(process.cwd(), "prompts/activelearn-system-prompt.md"), "utf-8");
  // Strip the file header (lines starting with # that precede the actual prompt)
  const lines = raw.split("\n");
  const separatorIdx = lines.findIndex((l) => l.startsWith("# ─"));
  const content = separatorIdx >= 0 ? lines.slice(separatorIdx + 1).join("\n").trimStart() : raw;
  return content;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isDownload = searchParams.get("download") === "1";

  const text = getPromptText();

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  };

  if (isDownload) {
    headers["Content-Disposition"] = 'attachment; filename="activelearn-system-prompt.txt"';
  }

  return new NextResponse(text, { status: 200, headers });
}
