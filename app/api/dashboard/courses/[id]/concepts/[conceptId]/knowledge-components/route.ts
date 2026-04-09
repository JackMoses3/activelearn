import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKnowledgeComponents } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string; conceptId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, conceptId } = await params;
  const kcs = await getKnowledgeComponents(id, conceptId, session.user.id);
  return NextResponse.json(kcs);
}
