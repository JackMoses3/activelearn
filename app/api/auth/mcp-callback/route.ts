import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const mcpState = searchParams.get("mcp_state");

  if (!mcpState) {
    return new NextResponse("Missing mcp_state parameter", { status: 400 });
  }

  const db = getDb();

  // Look up pending MCP auth
  const pending = await db.execute({
    sql: "SELECT * FROM pending_mcp_auth WHERE id = ?",
    args: [mcpState],
  });

  if (pending.rows.length === 0) {
    return new NextResponse(
      "MCP authorization session expired or not found. Please reconnect from your Claude settings.",
      { status: 400 }
    );
  }

  const row = pending.rows[0];

  // Check expiry
  if (new Date(row.expires_at as string) < new Date()) {
    await db.execute({ sql: "DELETE FROM pending_mcp_auth WHERE id = ?", args: [mcpState] });
    return new NextResponse(
      "MCP authorization session expired. Please reconnect from your Claude settings.",
      { status: 400 }
    );
  }

  // Issue auth code with user_id
  const authCode = randomUUID();
  const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.execute({
    sql: "INSERT INTO oauth_auth_codes (code, client_id, redirect_uri, code_challenge, user_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [
      authCode,
      row.client_id as string,
      row.redirect_uri as string,
      (row.code_challenge as string) ?? null,
      session.user.id,
      codeExpiresAt,
    ],
  });

  // Clean up pending auth
  await db.execute({ sql: "DELETE FROM pending_mcp_auth WHERE id = ?", args: [mcpState] });

  // Redirect back to MCP client
  const callbackUrl = new URL(row.redirect_uri as string);
  callbackUrl.searchParams.set("code", authCode);
  callbackUrl.searchParams.set("state", row.state as string);

  return NextResponse.redirect(callbackUrl.toString());
}
