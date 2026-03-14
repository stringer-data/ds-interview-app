import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeTags } from "@/lib/question-admin";

const bodySchema = z.object({
  question: z.string().min(1).optional(),
  reference_answer: z.string().nullable().optional(),
  difficulty_level: z.number().int().min(1).max(5).optional(),
  active: z.boolean().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  topic_id: z.number().int().positive().optional(),
  theme_id: z.number().int().positive().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (body.topic_id !== undefined) {
    const topic = await prisma.topic.findUnique({ where: { id: body.topic_id } });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 400 });
    }
  }
  if (body.theme_id !== undefined) {
    const theme = await prisma.theme.findUnique({ where: { id: body.theme_id } });
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 400 });
    }
  }
  const data: {
    question?: string;
    referenceAnswer?: string | null;
    difficultyLevel?: number;
    active?: boolean;
    category?: string | null;
    tags?: string[];
    topicId?: number;
    themeId?: number;
  } = {};
  if (body.question !== undefined) data.question = body.question;
  if (body.reference_answer !== undefined) data.referenceAnswer = body.reference_answer;
  if (body.difficulty_level !== undefined) data.difficultyLevel = body.difficulty_level;
  if (body.active !== undefined) data.active = body.active;
  if (body.category !== undefined) data.category = body.category;
  if (body.tags !== undefined) data.tags = normalizeTags(body.tags);
  if (body.topic_id !== undefined) data.topicId = body.topic_id;
  if (body.theme_id !== undefined) data.themeId = body.theme_id;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  try {
    const question = await prisma.question.update({
      where: { id: idNum },
      data,
    });
    return NextResponse.json(question);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Record to update not found|record not found/i.test(msg)) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
