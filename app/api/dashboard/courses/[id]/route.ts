import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { getConceptsForCourse, getCourseById } from "@/lib/queries";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // Verify course belongs to user
  const course = await getCourseById(id, userId);
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const concepts = await getConceptsForCourse(id, userId);
  return NextResponse.json({ concepts });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // Verify course belongs to user before deleting
  const course = await getCourseById(id, userId);
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ON DELETE CASCADE handles all dependent data
  const db = getDb();
  await db.execute({
    sql: "DELETE FROM courses WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });

  return NextResponse.json({ ok: true });
}
