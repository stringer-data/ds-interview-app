import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    topic: { findUnique: vi.fn() },
    theme: { findUnique: vi.fn() },
    question: { create: vi.fn() },
  },
}));

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockTopicFindUnique = vi.mocked(prisma.topic.findUnique);
const mockThemeFindUnique = vi.mocked(prisma.theme.findUnique);
const mockQuestionCreate = vi.mocked(prisma.question.create);

function jsonRequest(body: object) {
  return new Request("http://localhost/api/admin/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "admin@test.com" } } as never);
    mockTopicFindUnique.mockResolvedValue({ id: 1, name: "Causal", slug: "causal" } as never);
    mockThemeFindUnique.mockResolvedValue({ id: 1, name: "Basics", slug: "basics" } as never);
  });

  it("creates question and returns 201 with question", async () => {
    const created = {
      id: 99,
      slug: "causal_basics_01",
      topicId: 1,
      themeId: 1,
      difficultyStep: "STEP1_DEFINITION",
      difficultyLevel: 1,
      dimension: null,
      question: "What is causality?",
      referenceAnswer: "The answer.",
      category: "Causal Inference",
      tags: ["basics"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQuestionCreate.mockResolvedValue(created as never);

    const res = await POST(
      jsonRequest({
        slug: "causal_basics_01",
        topic_slug: "causal",
        theme_slug: "basics",
        difficulty_level: 1,
        question: "What is causality?",
        reference_answer: "The answer.",
        category: "Causal Inference",
        tags: ["basics"],
        active: true,
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(99);
    expect(data.slug).toBe("causal_basics_01");
    expect(data.question).toBe("What is causality?");
    expect(mockQuestionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "causal_basics_01",
        topicId: 1,
        themeId: 1,
        difficultyStep: "STEP1_DEFINITION",
        difficultyLevel: 1,
        question: "What is causality?",
        referenceAnswer: "The answer.",
        category: "Causal Inference",
        tags: ["basics"],
        active: true,
      }),
    });
  });

  it("returns 400 when topic_slug is not allowed", async () => {
    const res = await POST(
      jsonRequest({
        slug: "other_01",
        topic_slug: "other",
        theme_slug: "basics",
        difficulty_level: 1,
        question: "Q?",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid topic|topic_slug/i);
    expect(mockQuestionCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when topic not found in DB", async () => {
    mockTopicFindUnique.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({
        slug: "causal_01",
        topic_slug: "causal",
        theme_slug: "basics",
        difficulty_level: 1,
        question: "Q?",
      })
    );
    expect(res.status).toBe(400);
    expect(mockQuestionCreate).not.toHaveBeenCalled();
  });

  it("returns 409 when slug already in use", async () => {
    mockQuestionCreate.mockRejectedValue(new Error("Unique constraint failed on the fields: (`slug`)"));
    const res = await POST(
      jsonRequest({
        slug: "existing_slug",
        topic_slug: "causal",
        theme_slug: "basics",
        difficulty_level: 1,
        question: "Q?",
      })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/slug|unique|already/i);
  });
});
