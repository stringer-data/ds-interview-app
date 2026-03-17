import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findUnique: vi.fn(), findMany: vi.fn() },
    $executeRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/lib/embeddings", () => ({
  getEmbedding: vi.fn(),
}));

vi.mock("@/lib/embedding-input", () => ({
  buildEmbeddingInputText: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";
import { buildEmbeddingInputText } from "@/lib/embedding-input";
import { indexQuestionEmbedding, backfillQuestionEmbeddings } from "@/lib/embedding-index";

const mockQuestionFindUnique = vi.mocked(prisma.question.findUnique);
const mockQuestionFindMany = vi.mocked(prisma.question.findMany);
const mockExecuteRawUnsafe = vi.mocked(prisma.$executeRawUnsafe);
const mockGetEmbedding = vi.mocked(getEmbedding);
const mockBuildEmbeddingInputText = vi.mocked(buildEmbeddingInputText);

describe("indexQuestionEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads question, builds input text, embeds, and upserts QuestionEmbedding via raw SQL", async () => {
    mockQuestionFindUnique.mockResolvedValue({
      id: 123,
      question: "What is causality?",
      referenceAnswer: "Causality is ...",
    } as never);
    mockBuildEmbeddingInputText.mockReturnValue("INPUT");
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3] as never);
    mockExecuteRawUnsafe.mockResolvedValue(1 as never);

    await indexQuestionEmbedding(123);

    expect(mockQuestionFindUnique).toHaveBeenCalledWith({
      where: { id: 123 },
      select: { id: true, question: true, referenceAnswer: true },
    });
    expect(mockBuildEmbeddingInputText).toHaveBeenCalledWith("What is causality?", "Causality is ...");
    expect(mockGetEmbedding).toHaveBeenCalledWith("INPUT");
    expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(1);
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "QuestionEmbedding"'),
      123,
      "[0.1,0.2,0.3]",
      "text-embedding-3-small"
    );
  });

  it("throws if the question does not exist", async () => {
    mockQuestionFindUnique.mockResolvedValue(null as never);
    await expect(indexQuestionEmbedding(999)).rejects.toThrow(/Question.*not found/i);
    expect(mockExecuteRawUnsafe).not.toHaveBeenCalled();
  });
});

describe("backfillQuestionEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls indexQuestionEmbedding for each question id returned by findMany", async () => {
    mockQuestionFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }] as never);
    mockQuestionFindUnique
      .mockResolvedValueOnce({ id: 1, question: "Q1", referenceAnswer: null } as never)
      .mockResolvedValueOnce({ id: 2, question: "Q2", referenceAnswer: "A2" } as never);
    mockBuildEmbeddingInputText.mockReturnValue("INPUT");
    mockGetEmbedding.mockResolvedValue([0.1] as never);
    mockExecuteRawUnsafe.mockResolvedValue(1 as never);

    const result = await backfillQuestionEmbeddings();

    expect(mockQuestionFindMany).toHaveBeenCalledWith({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ total: 2, ok: 2, failed: 0 });
  });
});

