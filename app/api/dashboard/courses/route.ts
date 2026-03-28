import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCourses, getRecentSessions } from "@/lib/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [courses, sessions] = await Promise.all([getCourses(), getRecentSessions(10)]);
  return NextResponse.json({ courses, sessions });
}
