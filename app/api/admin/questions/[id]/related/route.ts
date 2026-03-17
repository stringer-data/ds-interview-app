import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";
import { buildEmbeddingInputText } from "@/lib/embedding-input";

const DEFAULT_K = 5;
const MAX_K = 20;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await params;
  const questionId = Number(id);
  if (!Number.isFinite(questionId)) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, question: true, referenceAnswer: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const kParam = searchParams.get("k");
  const k = kParam != null
    ? Math.min(MAX_K, Math.max(1, Number(kParam) || DEFAULT_K))
    : DEFAULT_K;

  const input = buildEmbeddingInputText(question.question, question.referenceAnswer);
  let embedding: number[];
  try {
    embedding = await getEmbedding(input);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to compute embedding" },
      { status: 500 }
    );
  }

  const vectorStr = "[" + embedding.join(",") + "]";
  type Row = { id: number; slug: string; question: string };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT q.id, q.slug, q.question FROM "QuestionEmbedding" e
     INNER JOIN "Question" q ON q.id = e.question_id
     WHERE e.question_id != $1
     ORDER BY e.embedding <=> $2::vector(1536)
     LIMIT $3`,
    questionId,
    vectorStr,
    k
  );

  const related = rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    question: r.question ?? "",
  }));
  return NextResponse.json({ slugs: related.map((r) => r.slug), related });
}
