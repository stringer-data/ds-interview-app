import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  selectNextQuestion,
  type AttemptRow,
} from "@/lib/questions";

const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";
const FREE_CAP = parseInt(process.env.FREE_QUESTION_CAP ?? "10", 10) || 10;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    select: { questionId: true, followUpId: true, score: true, loggedAt: true, topic: true },
    orderBy: { loggedAt: "asc" },
  });
  const questionsUsed = attempts.length;
  const isPaid = user.tier === "paid";
  const overCap = PAYMENTS_ENABLED && !isPaid && questionsUsed >= FREE_CAP;
  if (overCap) {
    return NextResponse.json(
      { upsell: true, questionsUsed, cap: FREE_CAP },
      { status: 200 }
    );
  }
  const rows: AttemptRow[] = attempts.map((a) => ({
    questionId: a.questionId,
    followUpId: a.followUpId,
    score: a.score,
    loggedAt: a.loggedAt,
    topic: a.topic,
  }));
  const next = selectNextQuestion(rows);
  if (!next) {
    return NextResponse.json({ error: "no_questions" }, { status: 404 });
  }
  return NextResponse.json(next);
}
