import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

const BASE = process.env.NEXTAUTH_URL ?? "https://activelearn.vercel.app";

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

  // Store pending MCP auth in database (provider-agnostic)
  const pendingId = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await db.execute({
    sql: "INSERT INTO pending_mcp_auth (id, client_id, redirect_uri, state, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [pendingId, clientId, redirectUri, state, codeChallenge ?? null, expiresAt],
  });

  // Redirect to login page with mcp_state — user picks their provider there
  const loginUrl = new URL(`${BASE}/login`);
  loginUrl.searchParams.set("mcp_state", pendingId);

  return NextResponse.redirect(loginUrl.toString());
}
