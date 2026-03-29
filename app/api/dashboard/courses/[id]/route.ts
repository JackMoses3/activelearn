import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getConceptsForCourse } from "@/lib/queries";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const concepts = await getConceptsForCourse(id);
  return NextResponse.json({ concepts });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  await db.batch(
    [
      { sql: "DELETE FROM knowledge_components WHERE course_id = ?", args: [id] },
      { sql: "DELETE FROM mastery_history WHERE course_id = ?", args: [id] },
      {
        sql: "DELETE FROM session_concepts WHERE session_id IN (SELECT id FROM sessions WHERE course_id = ?)",
        args: [id],
      },
      { sql: "DELETE FROM sessions WHERE course_id = ?", args: [id] },
      { sql: "DELETE FROM concept_mastery WHERE course_id = ?", args: [id] },
      { sql: "DELETE FROM courses WHERE id = ?", args: [id] },
    ],
    "write"
  );

  return NextResponse.json({ ok: true });
}
