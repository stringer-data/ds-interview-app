import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findUnique: vi.fn(), update: vi.fn() },
    topic: { findUnique: vi.fn() },
    theme: { findUnique: vi.fn() },
    questionRevision: { create: vi.fn() },
  },
}));

vi.mock("@/lib/embedding-index", () => ({
  indexQuestionEmbedding: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { indexQuestionEmbedding } from "@/lib/embedding-index";

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockQuestionFindUnique = vi.mocked(prisma.question.findUnique);
const mockQuestionUpdate = vi.mocked(prisma.question.update);
const mockTopicFindUnique = vi.mocked(prisma.topic.findUnique);
const mockThemeFindUnique = vi.mocked(prisma.theme.findUnique);
const mockQuestionRevisionCreate = vi.mocked(prisma.questionRevision.create);
const mockIndexQuestionEmbedding = vi.mocked(indexQuestionEmbedding);

function currentQuestion(overrides: Record<string, unknown> = {}) {
  return {
    question: "Q",
    referenceAnswer: null,
    difficultyLevel: 3,
    active: true,
    category: null,
    tags: [] as string[],
    topicId: 1,
    themeId: 1,
    ...overrides,
  };
}

function jsonRequest(body: object, id = "4") {
  return new Request(`http://localhost/api/admin/questions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/questions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "admin@test.com" } } as never);
    mockQuestionFindUnique.mockResolvedValue(currentQuestion() as never);
    mockQuestionRevisionCreate.mockResolvedValue({} as never);
    mockIndexQuestionEmbedding.mockResolvedValue(undefined as never);
  });

  it("updates question with category and tags", async () => {
    const updated = {
      id: 4,
      slug: "design_itt_01",
      category: "New Category",
      tags: ["tag1", "tag2"],
      question: "Q",
      referenceAnswer: null,
      difficultyLevel: 3,
      active: true,
      topicId: 1,
      themeId: 1,
      difficultyStep: "APPLIED",
      dimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQuestionUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(jsonRequest({ category: "New Category", tags: ["tag1", "tag2"] }), {
      params: Promise.resolve({ id: "4" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.category).toBe("New Category");
    expect(data.tags).toEqual(["tag1", "tag2"]);
    expect(mockQuestionUpdate).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { category: "New Category", tags: ["tag1", "tag2"] },
    });
    expect(mockIndexQuestionEmbedding).toHaveBeenCalledWith(4);
  });

  it("allows clearing tags with empty array", async () => {
    const updated = {
      id: 4,
      slug: "design_itt_01",
      category: null,
      tags: [],
      question: "Q",
      referenceAnswer: null,
      difficultyLevel: 3,
      active: true,
      topicId: 1,
      themeId: 1,
      difficultyStep: "APPLIED",
      dimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQuestionUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(jsonRequest({ tags: [] }), {
      params: Promise.resolve({ id: "4" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tags).toEqual([]);
    expect(mockQuestionUpdate).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { tags: [] },
    });
  });

  it("normalizes tags: trim, spaces to hyphens, lowercase, dedupe, sort", async () => {
    const updated = {
      id: 4,
      slug: "design_itt_01",
      category: null,
      tags: ["experimentation", "gen-ai"],
      question: "Q",
      referenceAnswer: null,
      difficultyLevel: 3,
      active: true,
      topicId: 1,
      themeId: 1,
      difficultyStep: "APPLIED",
      dimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQuestionUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(
      jsonRequest({ tags: ["Gen AI", "  experimentation  ", "gen-ai"] }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tags).toEqual(["experimentation", "gen-ai"]);
    expect(mockQuestionUpdate).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { tags: ["experimentation", "gen-ai"] },
    });
  });

  it("updates topic and theme when topic_id and theme_id are valid", async () => {
    mockTopicFindUnique.mockResolvedValue({ id: 2, name: "Experimentation", slug: "experimentation" } as never);
    mockThemeFindUnique.mockResolvedValue({ id: 2, name: "A/B", slug: "ab" } as never);
    const updated = {
      id: 4,
      slug: "design_itt_01",
      category: null,
      tags: [],
      question: "Q",
      referenceAnswer: null,
      difficultyLevel: 3,
      active: true,
      topicId: 2,
      themeId: 2,
      difficultyStep: "APPLIED",
      dimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQuestionUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(jsonRequest({ topic_id: 2, theme_id: 2 }), {
      params: Promise.resolve({ id: "4" }),
    });

    expect(res.status).toBe(200);
    expect(mockTopicFindUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockThemeFindUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mockQuestionUpdate).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { topicId: 2, themeId: 2 },
    });
  });

  it("returns 400 when topic_id is not found", async () => {
    mockTopicFindUnique.mockResolvedValue(null);
    const res = await PATCH(jsonRequest({ topic_id: 999 }), {
      params: Promise.resolve({ id: "4" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Topic not found");
    expect(mockQuestionUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when theme_id is not found", async () => {
    mockTopicFindUnique.mockResolvedValue({ id: 1, name: "Causal", slug: "causal" } as never);
    mockThemeFindUnique.mockResolvedValue(null);
    const res = await PATCH(jsonRequest({ topic_id: 1, theme_id: 999 }), {
      params: Promise.resolve({ id: "4" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Theme not found");
    expect(mockQuestionUpdate).not.toHaveBeenCalled();
  });

  it("allows clearing category with null", async () => {
    const updated = {
      id: 4,
      slug: "design_itt_01",
      category: null,
      tags: ["existing"],
      question: "Q",
      referenceAnswer: null,
      difficultyLevel: 3,
      active: true,
      topicId: 1,
      themeId: 1,
      difficultyStep: "APPLIED",
      dimension: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQuestionUpdate.mockResolvedValue(updated as never);

    const res = await PATCH(jsonRequest({ category: null }), {
      params: Promise.resolve({ id: "4" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.category).toBeNull();
    expect(mockQuestionUpdate).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { category: null },
    });
  });
});
