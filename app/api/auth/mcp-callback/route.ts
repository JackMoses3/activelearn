import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state");

  if (!code || !rawState) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  // Decode our pending state
  let pending: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge?: string;
  };
  try {
    pending = JSON.parse(Buffer.from(rawState, "base64url").toString());
  } catch {
    return new NextResponse("Invalid state", { status: 400 });
  }

  // Exchange GitHub code for access token (to verify user identity)
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return new NextResponse("GitHub auth failed", { status: 400 });
  }

  // Issue our own auth code
  const authCode = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const db = getDb();
  await db.execute({
    sql: "INSERT INTO oauth_auth_codes (code, client_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?)",
    args: [authCode, pending.clientId, pending.redirectUri, pending.codeChallenge ?? null, expiresAt],
  });

  // Redirect back to Claude.ai
  const callbackUrl = new URL(pending.redirectUri);
  callbackUrl.searchParams.set("code", authCode);
  callbackUrl.searchParams.set("state", pending.state);

  return NextResponse.redirect(callbackUrl.toString());
}
