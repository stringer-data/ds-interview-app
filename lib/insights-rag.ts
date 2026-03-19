/**
 * RAG helpers for Insights: find related questions by semantic similarity
 * to "weak area" text (e.g. topic + sample questions the user struggled with).
 */

import { prisma } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";

export type RelatedQuestionRow = {
  id: number;
  slug: string;
  question: string;
  topic_name: string;
  difficulty_level: number;
};

const DEFAULT_K = 15;
const MAX_K = 20;

/**
 * Find questions whose embeddings are most similar to the given seed text.
 * Excludes questions whose slug is in excludeSlugs (e.g. already answered).
 * Returns slug, question text, topic name, and difficulty level for use in recommendations.
 */
export async function getRelatedQuestionsByText(
  seedText: string,
  excludeSlugs: string[],
  k: number = DEFAULT_K
): Promise<RelatedQuestionRow[]> {
  const limit = Math.min(MAX_K, Math.max(1, k));
  const embedding = await getEmbedding(seedText);
  const vectorStr = "[" + embedding.join(",") + "]";

  const exclude = [...new Set(excludeSlugs)].filter(Boolean);

  const rows = await prisma.$queryRawUnsafe<RelatedQuestionRow[]>(
    `SELECT q.id, q.slug, q.question, t.name AS "topic_name", q.difficulty_level
     FROM "QuestionEmbedding" e
     INNER JOIN "Question" q ON q.id = e.question_id
     INNER JOIN "Topic" t ON t.id = q.topic_id
     WHERE q.active = true
     AND (cardinality($2::text[]) = 0 OR q.slug != ALL($2::text[]))
     ORDER BY e.embedding <=> $1::vector(1536)
     LIMIT $3`,
    vectorStr,
    exclude,
    limit
  );

  return rows;
}

/**
 * Build a single seed text from weak topics and sample question snippets
 * for embedding and similarity search.
 */
export function buildWeakAreaSeedText(
  topics: string[],
  sampleQuestionTexts: string[]
): string {
  const parts: string[] = [];
  if (topics.length > 0) {
    parts.push("Topics: " + topics.join(", "));
  }
  const samples = sampleQuestionTexts.slice(0, 3).map((t) => t.trim()).filter(Boolean);
  if (samples.length > 0) {
    parts.push("Sample questions: " + samples.join(" | "));
  }
  return parts.join("\n\n") || "Data science interview questions";
}
