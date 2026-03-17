import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getEmbedding } from "./embeddings";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      embeddings = { create: mockCreate };
    },
  };
});

describe("getEmbedding", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.OPENAI_API_KEY = "sk-test-key";
    mockCreate.mockResolvedValue({
      data: [{ embedding: Array(1536).fill(0.1) }],
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns array of length 1536 for text-embedding-3-small", async () => {
    const result = await getEmbedding("hello");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1536);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "text-embedding-3-small",
        input: "hello",
      })
    );
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(getEmbedding("hello")).rejects.toThrow(/OPENAI_API_KEY/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when OPENAI_API_KEY is empty", async () => {
    process.env.OPENAI_API_KEY = "";
    await expect(getEmbedding("hello")).rejects.toThrow(/OPENAI_API_KEY/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when the API throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API error"));
    await expect(getEmbedding("hello")).rejects.toThrow("API error");
  });
});
