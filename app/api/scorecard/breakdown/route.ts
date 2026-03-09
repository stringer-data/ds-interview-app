import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    select: { topic: true, difficulty: true, score: true, maxScore: true },
  });

  const levels = [1, 2, 3, 4, 5] as const;
  type Level = (typeof levels)[number];
  const byTopicLevel: Record<string, Partial<Record<Level, { sumScore: number; count: number }>>> = {};

  for (const a of attempts) {
    const level = a.difficulty as Level;
    if (level < 1 || level > 5) continue;
    if (!byTopicLevel[a.topic]) byTopicLevel[a.topic] = {};
    const cell = byTopicLevel[a.topic][level];
    if (!cell) {
      byTopicLevel[a.topic][level] = { sumScore: a.score, count: 1 };
    } else {
      cell.sumScore += a.score;
      cell.count += 1;
    }
  }

  const topics = Object.keys(byTopicLevel).sort();
  const data: Record<string, Record<number, { avgScore: number; count: number }>> = {};
  for (const topic of topics) {
    data[topic] = {};
    for (const level of levels) {
      const cell = byTopicLevel[topic]?.[level];
      if (cell && cell.count > 0) {
        data[topic][level] = {
          avgScore: Math.round((cell.sumScore / cell.count) * 10) / 10,
          count: cell.count,
        };
      }
    }
  }

  return NextResponse.json({ topics, levels, data });
}
