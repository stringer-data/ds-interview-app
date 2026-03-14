import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findUnique: vi.fn() },
    questionComment: { create: vi.fn() },
  },
}));

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockQuestionFindUnique = vi.mocked(prisma.question.findUnique);
const mockQuestionCommentCreate = vi.mocked(prisma.questionComment.create);

function jsonRequest(body: object) {
  return new Request("http://localhost/api/question-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/question-comment", () => {
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
    mockQuestionCommentCreate.mockResolvedValue({} as never);
  });

  it("returns 401 when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(jsonRequest({ question_id: "causal_01", body: "Great question." }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
    expect(mockQuestionCommentCreate).not.toHaveBeenCalled();
  });

  it("creates a comment and returns 200 when authenticated with valid body", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01", body: "Great question." }));
    expect(res.status).toBe(200);
    expect(mockQuestionFindUnique).toHaveBeenCalledWith({
      where: { slug: "causal_01" },
      select: { id: true },
    });
    expect(mockQuestionCommentCreate).toHaveBeenCalledWith({
      data: { questionId: 42, userId: "user-1", body: "Great question.", isOfficial: false },
    });
    const data = await res.json();
    expect(data).toHaveProperty("ok", true);
  });

  it("trims body before saving", async () => {
    await POST(jsonRequest({ question_id: "causal_01", body: "  trimmed  " }));
    expect(mockQuestionCommentCreate).toHaveBeenCalledWith({
      data: { questionId: 42, userId: "user-1", body: "trimmed", isOfficial: false },
    });
  });

  it("returns 400 when question_id is missing", async () => {
    const res = await POST(jsonRequest({ body: "Some insight" }));
    expect(res.status).toBe(400);
    expect(mockQuestionCommentCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01" }));
    expect(res.status).toBe(400);
    expect(mockQuestionCommentCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const res = await POST(jsonRequest({ question_id: "causal_01", body: "" }));
    expect(res.status).toBe(400);
    expect(mockQuestionCommentCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when question slug is not found", async () => {
    mockQuestionFindUnique.mockResolvedValue(null);
    const res = await POST(jsonRequest({ question_id: "nonexistent", body: "Comment" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Question not found");
    expect(mockQuestionCommentCreate).not.toHaveBeenCalled();
  });
});
