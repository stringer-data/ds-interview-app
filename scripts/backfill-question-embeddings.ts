#!/usr/bin/env npx tsx
/**
 * Backfill QuestionEmbedding for all existing questions.
 * Loads .env, fetches all question ids, and calls indexQuestionEmbedding for each
 * (with optional delay to avoid rate limits).
 *
 * Usage (from project root):
 *   npx tsx scripts/backfill-question-embeddings.ts
 *   DELAY_MS=200 npx tsx scripts/backfill-question-embeddings.ts
 *
 * Or: npm run backfill:embeddings
 */
import "dotenv/config";
import { backfillQuestionEmbeddings } from "../lib/embedding-index";

async function main() {
  const delayMs = Math.max(0, Number(process.env.DELAY_MS) || 0);
  console.log("Backfilling question embeddings..." + (delayMs ? ` (delay ${delayMs}ms between questions)` : ""));
  const result = await backfillQuestionEmbeddings({ delayMs });
  console.log(`Done. total=${result.total} ok=${result.ok} failed=${result.failed}`);
  if (result.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
