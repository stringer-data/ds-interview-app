import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { id: userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const attempts = await prisma.attempt.findMany({
      where: { userId },
      select: {
        id: true,
        questionText: true,
        answer: true,
        loggedAt: true,
        score: true,
        maxScore: true,
      },
      orderBy: { loggedAt: "desc" },
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      attempts: attempts.map((a) => ({
        id: a.id,
        questionAsked: a.questionText ?? "—",
        timestampAsked: a.loggedAt,
        response: a.answer ?? "—",
        score: a.score,
        maxScore: a.maxScore,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
