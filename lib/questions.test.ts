import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { invalidateQuestionCache, selectNextQuestion, type AttemptRow } from "./questions";

const mockQuestionFindMany = vi.mocked(prisma.question.findMany);

describe("selectNextQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQuestionCache();
  });

  it("prefers unseen questions before retrying low-score questions", async () => {
    mockQuestionFindMany.mockResolvedValue([
      {
        slug: "q-repeat",
        difficultyLevel: 2,
        dimension: null,
        question: "Repeated question",
        referenceAnswer: "A",
        category: null,
        tags: [],
        topic: { name: "Experimentation" },
        theme: { name: "Design" },
      },
      {
        slug: "q-new",
        difficultyLevel: 3,
        dimension: null,
        question: "Unseen question",
        referenceAnswer: "B",
        category: null,
        tags: [],
        topic: { name: "Metrics" },
        theme: { name: "Tradeoffs" },
      },
    ] as never);

    const attempts: AttemptRow[] = [
      {
        questionId: "q-repeat",
        followUpId: null,
        score: 1,
        loggedAt: new Date("2026-03-18T10:00:00.000Z"),
        topic: "Experimentation",
      },
    ];

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const next = await selectNextQuestion(attempts);
    randomSpy.mockRestore();

    expect(next).not.toBeNull();
    expect(next?.questionDisplayId).toBe("q-new");
  });

  it("avoids returning excluded question id when alternatives exist", async () => {
    mockQuestionFindMany.mockResolvedValue([
      {
        slug: "q-same",
        difficultyLevel: 2,
        dimension: null,
        question: "Question A",
        referenceAnswer: "A",
        category: null,
        tags: [],
        topic: { name: "Experimentation" },
        theme: { name: "Design" },
      },
      {
        slug: "q-other",
        difficultyLevel: 2,
        dimension: null,
        question: "Question B",
        referenceAnswer: "B",
        category: null,
        tags: [],
        topic: { name: "Experimentation" },
        theme: { name: "Design" },
      },
    ] as never);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const next = await selectNextQuestion([], { excludeQuestionId: "q-same" });
    randomSpy.mockRestore();

    expect(next).not.toBeNull();
    expect(next?.questionDisplayId).toBe("q-other");
  });
});
