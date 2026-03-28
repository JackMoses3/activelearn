import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const BASE = process.env.NEXTAUTH_URL ?? "https://activelearn.vercel.app";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");

  if (!clientId || !redirectUri || !state) {
    return NextResponse.json({ error: "missing required params" }, { status: 400 });
  }

  // Verify client exists
  const db = getDb();
  const client = await db.execute({
    sql: "SELECT redirect_uris FROM oauth_clients WHERE client_id = ?",
    args: [clientId],
  });
  if (client.rows.length === 0) {
    return NextResponse.json({ error: "unknown client" }, { status: 400 });
  }
  const allowed: string[] = JSON.parse(client.rows[0].redirect_uris as string);
  if (!allowed.includes(redirectUri)) {
    return NextResponse.json({ error: "redirect_uri mismatch" }, { status: 400 });
  }

  // Store pending auth state in GitHub state param (URL-safe base64)
  const pendingState = Buffer.from(
    JSON.stringify({ clientId, redirectUri, state, codeChallenge })
  ).toString("base64url");

  const githubCallback = `${BASE}/api/auth/mcp-callback`;
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  githubUrl.searchParams.set("redirect_uri", githubCallback);
  githubUrl.searchParams.set("state", pendingState);
  githubUrl.searchParams.set("scope", "read:user");

  return NextResponse.redirect(githubUrl.toString());
}
