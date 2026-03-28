import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await req.json().catch(() => ({}));
  }

  const { grant_type, code, redirect_uri, client_id } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400, headers: CORS });
  }
  if (!code || !redirect_uri || !client_id) {
    return NextResponse.json({ error: "missing required params" }, { status: 400, headers: CORS });
  }

  const db = getDb();

  // Look up auth code
  const row = await db.execute({
    sql: "SELECT * FROM oauth_auth_codes WHERE code = ?",
    args: [code],
  });
  if (row.rows.length === 0) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }

  const authCode = row.rows[0];

  // Validate
  if (authCode.client_id !== client_id) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }
  if (authCode.redirect_uri !== redirect_uri) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }
  if (new Date(authCode.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "invalid_grant", error_description: "code expired" }, { status: 400, headers: CORS });
  }

  // Delete used code (single-use)
  await db.execute({ sql: "DELETE FROM oauth_auth_codes WHERE code = ?", args: [code] });

  // Issue access token
  const accessToken = randomUUID();
  await db.execute({
    sql: "INSERT INTO oauth_tokens (token, client_id, created_at) VALUES (?, ?, ?)",
    args: [accessToken, client_id, new Date().toISOString()],
  });

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      scope: "mcp",
    },
    { headers: CORS }
  );
}
