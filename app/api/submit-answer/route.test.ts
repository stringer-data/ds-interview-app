import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    attempt: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/grader", () => ({
  gradeAnswer: vi.fn(),
}));

vi.mock("@/lib/questions", () => ({
  getQuestionById: vi.fn(),
  selectNextQuestion: vi.fn(),
}));

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gradeAnswer } from "@/lib/grader";
import { getQuestionById, selectNextQuestion } from "@/lib/questions";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockGetQuestionById = vi.mocked(getQuestionById);
const mockGradeAnswer = vi.mocked(gradeAnswer);
const mockAttemptCreate = vi.mocked(prisma.attempt.create);
const mockAttemptFindMany = vi.mocked(prisma.attempt.findMany);
const mockSelectNextQuestion = vi.mocked(selectNextQuestion);

function jsonRequest(body: object) {
  return new Request("http://localhost/api/submit-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/submit-answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@example.com",
      tier: "free",
      firstLoginAt: null,
      lastLoginAt: null,
    });
    mockGetQuestionById.mockReturnValue({
      id: "q1",
      topic: "Math/Stats",
      theme: "Basics",
      difficulty: 1,
      question: "What is 2+2?",
      reference_answer: "4",
    });
    mockGradeAnswer.mockResolvedValue({
      score: 3,
      maxScore: 4,
      verdict: "Mostly correct",
      whatWasGood: "Good",
      missingWrong: "—",
      exampleAnswers: "—",
      followUpQuestion: "—",
    });
    mockAttemptCreate.mockResolvedValue({} as never);
    mockAttemptFindMany.mockResolvedValue([
      {
        questionId: "q1",
        followUpId: null,
        score: 3,
        loggedAt: new Date(),
        topic: "Math/Stats",
      },
    ]);
    mockSelectNextQuestion.mockReturnValue({
      questionId: "q2",
      followUpId: null,
      questionDisplayId: "q2",
      topic: "Stats",
      theme: "Basics",
      difficulty: 2,
      question: "Next?",
    });
  });

  it("returns 401 when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(jsonRequest({ question_id: "q1", answer: "four" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
  });

  it("returns 400 when body is invalid (missing answer)", async () => {
    const res = await POST(jsonRequest({ question_id: "q1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Invalid body");
  });

  it("returns 400 when answer is empty string", async () => {
    const res = await POST(jsonRequest({ question_id: "q1", answer: "" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Invalid body");
  });

  it("returns 404 when question is not found", async () => {
    mockGetQuestionById.mockReturnValue(null);
    const res = await POST(jsonRequest({ question_id: "bad-id", answer: "x" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Question not found");
  });

  it("returns 500 with JSON error when gradeAnswer throws", async () => {
    mockGradeAnswer.mockRejectedValue(new Error("OpenAI failed"));
    const res = await POST(jsonRequest({ question_id: "q1", answer: "four" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Something went wrong. Please try again.");
  });

  it("returns 500 with JSON error when prisma.attempt.create throws", async () => {
    mockAttemptCreate.mockRejectedValue(new Error("DB error"));
    const res = await POST(jsonRequest({ question_id: "q1", answer: "four" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Something went wrong. Please try again.");
  });

  it("returns 200 with valid JSON and expected shape on success", async () => {
    const res = await POST(jsonRequest({ question_id: "q1", answer: "four" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      score: 3,
      maxScore: 4,
      verdict: "Mostly correct",
      whatWasGood: "Good",
      questionsUsed: 1,
      upsell: false,
    });
    expect(data).toHaveProperty("missingWrong");
    expect(data).toHaveProperty("exampleAnswers");
    expect(data).toHaveProperty("followUpQuestion");
    expect(data).toHaveProperty("nextQuestion");
  });
});
