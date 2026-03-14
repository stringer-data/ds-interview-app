import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findUnique: vi.fn() },
    questionRating: { create: vi.fn() },
  },
}));

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockQuestionFindUnique = vi.mocked(prisma.question.findUnique);
const mockQuestionRatingCreate = vi.mocked(prisma.questionRating.create);

function jsonRequest(body: object) {
  return new Request("http://localhost/api/rate-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rate-question", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@example.com",
      tier: "free",
      firstLoginAt: null,
      lastLoginAt: null,
    });
    mockQuestionFindUnique.mockResolvedValue({ id: 42 } as never);
    mockQuestionRatingCreate.mockResolvedValue({} as never);
  });

  it("returns 401 when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(jsonRequest({ question_id: "causal_01", rating: 3 }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
    expect(mockQuestionRatingCreate).not.toHaveBeenCalled();
  });

  it("creates a rating and returns 200 when authenticated with valid body", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01", rating: 3 }));
    expect(res.status).toBe(200);
    expect(mockQuestionFindUnique).toHaveBeenCalledWith({
      where: { slug: "causal_01" },
      select: { id: true },
    });
    expect(mockQuestionRatingCreate).toHaveBeenCalledWith({
      data: { questionId: 42, userId: "user-1", rating: 3 },
    });
    const data = await res.json();
    expect(data).toHaveProperty("ok", true);
  });

  it("returns 400 when question_id is missing", async () => {
    const res = await POST(jsonRequest({ rating: 3 }));
    expect(res.status).toBe(400);
    expect(mockQuestionRatingCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when rating is missing", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01" }));
    expect(res.status).toBe(400);
    expect(mockQuestionRatingCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when rating is out of range (0)", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01", rating: 0 }));
    expect(res.status).toBe(400);
    expect(mockQuestionRatingCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when rating is out of range (6)", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01", rating: 6 }));
    expect(res.status).toBe(400);
    expect(mockQuestionRatingCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when question slug is not found", async () => {
    mockQuestionFindUnique.mockResolvedValue(null);
    const res = await POST(jsonRequest({ question_id: "nonexistent", rating: 3 }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Question not found");
    expect(mockQuestionRatingCreate).not.toHaveBeenCalled();
  });
});
