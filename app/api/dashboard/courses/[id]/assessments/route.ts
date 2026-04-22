import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAssessmentsForCourse } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assessments = await getAssessmentsForCourse(id, session.user.id);
  return NextResponse.json({ assessments });
}
