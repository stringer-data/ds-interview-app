import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findUnique: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/lib/embeddings", () => ({
  getEmbedding: vi.fn(),
}));

vi.mock("@/lib/embedding-input", () => ({
  buildEmbeddingInputText: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";
import { buildEmbeddingInputText } from "@/lib/embedding-input";

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockQuestionFindUnique = vi.mocked(prisma.question.findUnique);
const mockQueryRawUnsafe = vi.mocked(prisma.$queryRawUnsafe);
const mockGetEmbedding = vi.mocked(getEmbedding);
const mockBuildEmbeddingInputText = vi.mocked(buildEmbeddingInputText);

describe("GET /api/admin/questions/[id]/related", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "admin@test.com" } } as never);
    mockQuestionFindUnique.mockResolvedValue({
      id: 1,
      question: "What is design?",
      referenceAnswer: "Design is ...",
    } as never);
    mockBuildEmbeddingInputText.mockReturnValue("INPUT");
    mockGetEmbedding.mockResolvedValue([0.1, 0.2] as never);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue({ error: "Unauthorized", status: 401 } as never);

    const res = await GET(
      new Request("http://localhost/api/admin/questions/1/related?k=5"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(401);
    expect(mockQuestionFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when question not found", async () => {
    mockQuestionFindUnique.mockResolvedValue(null as never);

    const res = await GET(
      new Request("http://localhost/api/admin/questions/999/related?k=5"),
      { params: Promise.resolve({ id: "999" }) }
    );

    expect(res.status).toBe(404);
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
  });

  it("returns related slugs and related id+slug+question from k-NN (excludes current question)", async () => {
    mockQueryRawUnsafe.mockResolvedValue([
      { id: 2, slug: "question_2_slug", question: "What is the second question?" },
    ] as never);

    const res = await GET(
      new Request("http://localhost/api/admin/questions/1/related?k=1"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slugs).toEqual(["question_2_slug"]);
    expect(data.related).toEqual([
      { id: 2, slug: "question_2_slug", question: "What is the second question?" },
    ]);
    expect(mockQuestionFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, question: true, referenceAnswer: true },
    });
    expect(mockBuildEmbeddingInputText).toHaveBeenCalledWith("What is design?", "Design is ...");
    expect(mockGetEmbedding).toHaveBeenCalledWith("INPUT");
    expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("QuestionEmbedding"),
      1,
      "[0.1,0.2]",
      1
    );
  });
});
