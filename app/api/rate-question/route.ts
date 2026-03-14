import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  question_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const question = await prisma.question.findUnique({
    where: { slug: body.question_id },
    select: { id: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  await prisma.questionRating.create({
    data: {
      questionId: question.id,
      userId: user.id,
      rating: body.rating,
    },
  });
  return NextResponse.json({ ok: true });
}
