import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    attempt: { findMany: vi.fn() },
    question: {
      findMany: vi.fn().mockResolvedValue([
        { slug: "q1", question: "Q1?", difficultyLevel: 1, topic: { name: "Causal" } },
        { slug: "q2", question: "Q2?", difficultyLevel: 2, topic: { name: "Causal" } },
      ]),
    },
  },
}));
vi.mock("@/lib/insights-llm", () => ({
  buildHistorySummary: vi.fn(() => "summary text"),
  generateInsights: vi.fn(),
}));
vi.mock("@/lib/insights-rag", () => ({
  buildWeakAreaSeedText: vi.fn(() => "seed"),
  getRelatedQuestionsByText: vi.fn(() => []),
}));

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInsights } from "@/lib/insights-llm";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockAttemptFindMany = vi.mocked(prisma.attempt.findMany);
const mockGenerateInsights = vi.mocked(generateInsights);

describe("GET /api/insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@example.com",
      tier: "free",
      firstLoginAt: null,
      lastLoginAt: null,
    });
  });

  it("returns 401 when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/insights"));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
    expect(mockAttemptFindMany).not.toHaveBeenCalled();
  });

  it("returns hasEnoughData false when attempt count < 5", async () => {
    mockAttemptFindMany.mockResolvedValue([
      {
        questionId: "q1",
        followUpId: null,
        topic: "Causal",
        theme: "T1",
        difficulty: 1,
        score: 3,
        maxScore: 4,
        questionText: "Q?",
        answer: "A",
        loggedAt: new Date(),
      },
    ] as never[]);
    const res = await GET(new Request("http://localhost/api/insights"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      hasEnoughData: false,
      attemptCount: 1,
      minAttempts: 5,
    });
    expect(mockGenerateInsights).not.toHaveBeenCalled();
  });

  it("returns hasEnoughData true and insights when attempt count >= 5", async () => {
    const fiveAttempts = Array.from({ length: 5 }, (_, i) => ({
      questionId: `q${i}`,
      followUpId: null,
      topic: "Causal",
      theme: "T1",
      difficulty: 1,
      score: 2,
      maxScore: 4,
      questionText: "Question?",
      answer: "Answer",
      loggedAt: new Date(),
    }));
    mockAttemptFindMany.mockResolvedValue(fiveAttempts as never[]);
    mockGenerateInsights.mockResolvedValue({
      summary: "You're making progress.",
      strengths: [{ topic: "Causal", reason: "Solid base.", evidence: "Scores 2–3." }],
      improvement_areas: [],
      patterns: [],
      next_steps: ["Practice more."],
      recommended_questions: [],
    });
    const res = await GET(new Request("http://localhost/api/insights"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasEnoughData).toBe(true);
    expect(data.attemptCount).toBe(5);
    expect(data.insights).toBeDefined();
    expect(data.insights.summary).toBe("You're making progress.");
  });
});
