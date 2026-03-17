import { prisma } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";
import { buildEmbeddingInputText } from "@/lib/embedding-input";

const EMBEDDING_MODEL_VERSION = "text-embedding-3-small";

export async function indexQuestionEmbedding(questionId: number): Promise<void> {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, question: true, referenceAnswer: true },
  });

  if (!q) {
    throw new Error(`Question not found: ${questionId}`);
  }

  const input = buildEmbeddingInputText(q.question, q.referenceAnswer);
  const embedding = await getEmbedding(input);

  // Prisma does not support write operations on models with required Unsupported (vector) fields.
  // Use raw SQL to upsert the embedding.
  const vectorStr = "[" + embedding.join(",") + "]";
  await prisma.$executeRawUnsafe(
    `INSERT INTO "QuestionEmbedding" (question_id, embedding, model_version, updated_at)
     VALUES ($1, $2::vector(1536), $3, NOW())
     ON CONFLICT (question_id) DO UPDATE SET
       embedding = EXCLUDED.embedding,
       model_version = EXCLUDED.model_version,
       updated_at = NOW()`,
    questionId,
    vectorStr,
    EMBEDDING_MODEL_VERSION
  );
}

export type BackfillOptions = {
  /** Delay in ms between each question to avoid rate limits. Default 0. */
  delayMs?: number;
};

/**
 * Load all question ids and call indexQuestionEmbedding for each.
 * Used by the backfill script to populate QuestionEmbedding for existing questions.
 */
export async function backfillQuestionEmbeddings(options: BackfillOptions = {}): Promise<{ total: number; ok: number; failed: number }> {
  const { delayMs = 0 } = options;
  const questions = await prisma.question.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  let ok = 0;
  let failed = 0;
  for (const { id } of questions) {
    try {
      await indexQuestionEmbedding(id);
      ok++;
    } catch (e) {
      failed++;
      console.error(`Failed to index question ${id}:`, e instanceof Error ? e.message : e);
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return { total: questions.length, ok, failed };
}
