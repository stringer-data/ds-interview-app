import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/questions", () => ({ getQuestionById: vi.fn() }));

import { getCurrentUser } from "@/lib/auth";
import { getQuestionById } from "@/lib/questions";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockGetQuestionById = vi.mocked(getQuestionById);

describe("GET /api/question", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@example.com",
      tier: "free",
      firstLoginAt: null,
      lastLoginAt: null,
    });
    mockGetQuestionById.mockResolvedValue({
      id: "design_itt_01",
      topic: "Metrics",
      theme: "Design",
      difficulty: 2,
      question: "How would you design an A/B test?",
      reference_answer: "Define metric, sample size...",
    } as never);
  });

  it("returns 401 when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/question?slug=design_itt_01"));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Unauthorized");
    expect(mockGetQuestionById).not.toHaveBeenCalled();
  });

  it("returns 400 when slug is missing", async () => {
    const res = await GET(new Request("http://localhost/api/question"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Missing slug");
    expect(mockGetQuestionById).not.toHaveBeenCalled();
  });

  it("returns 404 when question is not found", async () => {
    mockGetQuestionById.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/question?slug=nonexistent"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("error", "Question not found");
  });

  it("returns 200 with question shape when slug is valid", async () => {
    const res = await GET(new Request("http://localhost/api/question?slug=design_itt_01"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      questionId: "design_itt_01",
      followUpId: null,
      questionDisplayId: "design_itt_01",
      topic: "Metrics",
      theme: "Design",
      difficulty: 2,
      question: "How would you design an A/B test?",
      reference_answer: "Define metric, sample size...",
    });
  });
});
