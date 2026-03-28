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
  const body = await req.json().catch(() => ({}));
  const redirectUris: string[] = body.redirect_uris ?? [];

  if (redirectUris.length === 0) {
    return NextResponse.json({ error: "redirect_uris required" }, { status: 400, headers: CORS });
  }

  const clientId = randomUUID();
  const db = getDb();

  await db.execute({
    sql: "INSERT INTO oauth_clients (client_id, redirect_uris, created_at) VALUES (?, ?, ?)",
    args: [clientId, JSON.stringify(redirectUris), new Date().toISOString()],
  });

  return NextResponse.json(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: CORS }
  );
}
