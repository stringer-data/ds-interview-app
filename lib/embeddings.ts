import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Get embedding vector for text using OpenAI text-embedding-3-small (1536 dimensions).
 * @throws if OPENAI_API_KEY is missing or the API call fails
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings");
  }
  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("OpenAI embeddings response had no data");
  }
  return Array.isArray(embedding) ? [...embedding] : Array.from(embedding);
}
