import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Get local date string YYYY-MM-DD for a Date in the given IANA timezone */
function toLocalDateString(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const timezone = searchParams.get("timezone")?.trim() || "UTC";

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    select: { score: true, maxScore: true, topic: true, loggedAt: true },
  });
  const totalPoints = attempts.reduce((s, a) => s + a.score, 0);
  const maxPoints = attempts.reduce((s, a) => s + a.maxScore, 0);

  const today = toLocalDateString(new Date(), timezone);
  const todayAttempts = attempts.filter((a) => toLocalDateString(a.loggedAt, timezone) === today);
  const todayPoints = todayAttempts.reduce((s, a) => s + a.score, 0);
  const todayMax = todayAttempts.reduce((s, a) => s + a.maxScore, 0);

  const byTopic: Record<string, { score: number; max: number }> = {};
  for (const a of attempts) {
    if (!byTopic[a.topic]) byTopic[a.topic] = { score: 0, max: 0 };
    byTopic[a.topic].score += a.score;
    byTopic[a.topic].max += a.maxScore;
  }
  const accuracyByTopic: Record<string, number> = {};
  for (const [t, d] of Object.entries(byTopic)) {
    accuracyByTopic[t] = d.max ? d.score / d.max : 0;
  }
  const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";
  const FREE_CAP = parseInt(process.env.FREE_QUESTION_CAP ?? "10", 10) || 10;
  const questionsUsed = attempts.length;
  const isPaid = user.tier === "paid";
  const questionsLeft = isPaid || !PAYMENTS_ENABLED ? null : Math.max(0, FREE_CAP - questionsUsed);

  // Streak: consecutive days (in user's timezone) with at least one attempt, ending on the most recent activity day
  const uniqueDates = [...new Set(attempts.map((a) => toLocalDateString(a.loggedAt, timezone)))].sort().reverse();
  let streak = 0;
  let streakEndsOn: string | null = null;
  if (uniqueDates.length > 0) {
    streakEndsOn = uniqueDates[0];
    streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T12:00:00Z");
      const curr = new Date(uniqueDates[i] + "T12:00:00Z");
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streak++;
      else break;
    }
  }

  return NextResponse.json({
    tier: user.tier,
    questionsUsed,
    questionsLeft,
    totalPoints,
    maxPoints,
    overallPct: maxPoints ? totalPoints / maxPoints : 0,
    todayPoints,
    todayMax,
    todayPct: todayMax ? todayPoints / todayMax : 0,
    questionsAnsweredToday: todayAttempts.length,
    streak,
    streakEndsOn,
    accuracyByTopic,
  });
}
