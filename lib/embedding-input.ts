/**
 * Builds a single string from question and optional reference answer for embedding.
 * Used so RAG similarity is over question + reference content.
 */
export function buildEmbeddingInputText(
  question: string,
  referenceAnswer: string | null
): string {
  const q = question?.trim() ?? "";
  const ref = referenceAnswer?.trim() ?? "";
  if (!ref) return q;
  return `${q}\n\n${ref}`.trim();
}
