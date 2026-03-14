import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeTags, difficultyLevelToStep } from "@/lib/question-admin";
import { ALL_TOPICS, topicToSlug } from "@/lib/topics";

const ALLOWED_TOPIC_SLUGS = ALL_TOPICS.map((t) => topicToSlug(t));

const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  topic_slug: z.string().min(1),
  theme_slug: z.string().min(1),
  difficulty_level: z.number().int().min(1).max(5),
  question: z.string().min(1),
  reference_answer: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!ALLOWED_TOPIC_SLUGS.includes(body.topic_slug)) {
    return NextResponse.json({ error: "Invalid topic_slug" }, { status: 400 });
  }
  const topic = await prisma.topic.findUnique({ where: { slug: body.topic_slug } });
  const theme = await prisma.theme.findUnique({ where: { slug: body.theme_slug } });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 400 });
  }
  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 400 });
  }
  const slug = body.slug.trim();
  const difficultyStep = difficultyLevelToStep(body.difficulty_level);
  const tags = body.tags !== undefined ? normalizeTags(body.tags) : [];
  try {
    const question = await prisma.question.create({
      data: {
        slug,
        topicId: topic.id,
        themeId: theme.id,
        difficultyStep,
        difficultyLevel: body.difficulty_level,
        question: body.question.trim(),
        referenceAnswer: body.reference_answer?.trim() || null,
        category: body.category?.trim() || null,
        tags,
        active: body.active ?? true,
      },
    });
    return NextResponse.json(question, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Unique constraint|unique|duplicate key/i.test(msg)) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
