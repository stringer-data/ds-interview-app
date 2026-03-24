import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { indexQuestionEmbedding } from "@/lib/embedding-index";
import { normalizeTags } from "@/lib/question-admin";
import { invalidateQuestionCache } from "@/lib/questions";

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
  const { user } = result;
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
    const current = await prisma.question.findUnique({
      where: { id: idNum },
      select: {
        question: true,
        referenceAnswer: true,
        difficultyLevel: true,
        active: true,
        category: true,
        tags: true,
        topicId: true,
        themeId: true,
      },
    });
    if (!current) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    const oldValue: Record<string, Prisma.JsonValue> = {};
    const newValue: Record<string, Prisma.JsonValue> = {};
    if (data.question !== undefined) {
      oldValue.question = current.question;
      newValue.question = data.question;
    }
    if (data.referenceAnswer !== undefined) {
      oldValue.reference_answer = current.referenceAnswer;
      newValue.reference_answer = data.referenceAnswer;
    }
    if (data.difficultyLevel !== undefined) {
      oldValue.difficulty_level = current.difficultyLevel;
      newValue.difficulty_level = data.difficultyLevel;
    }
    if (data.active !== undefined) {
      oldValue.active = current.active;
      newValue.active = data.active;
    }
    if (data.category !== undefined) {
      oldValue.category = current.category;
      newValue.category = data.category;
    }
    if (data.tags !== undefined) {
      oldValue.tags = current.tags;
      newValue.tags = data.tags;
    }
    if (data.topicId !== undefined) {
      oldValue.topic_id = current.topicId;
      newValue.topic_id = data.topicId;
    }
    if (data.themeId !== undefined) {
      oldValue.theme_id = current.themeId;
      newValue.theme_id = data.themeId;
    }
    const question = await prisma.question.update({
      where: { id: idNum },
      data,
    });
    await prisma.questionRevision.create({
      data: {
        questionId: idNum,
        editorUserId: user.id,
        oldValue,
        newValue,
      },
    });
    try {
      await indexQuestionEmbedding(idNum);
    } catch (e) {
      console.error("Failed to index question embedding:", e);
    }
    invalidateQuestionCache();
    return NextResponse.json(question);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Record to update not found|record not found/i.test(msg)) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
