import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      tier: true,
      firstLoginAt: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { lastLoginAt: "desc" },
  });
  const list = users.map((u) => ({
    id: u.id,
    email: u.email,
    tier: u.tier,
    firstLoginAt: u.firstLoginAt,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    questionsAnswered: u._count.attempts,
  }));
  return NextResponse.json({ users: list });
}
