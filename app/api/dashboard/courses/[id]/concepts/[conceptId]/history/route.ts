import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConceptHistory } from "@/lib/queries";

interface Params {
  params: Promise<{ id: string; conceptId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, conceptId } = await params;
  const history = await getConceptHistory(id, conceptId, session.user.id);
  return NextResponse.json(history);
}
