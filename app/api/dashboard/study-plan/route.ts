import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStudyPlan } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getStudyPlan(session.user.id);
  return NextResponse.json({ plan });
}
