/**
 * Regression test: admin question detail page must render question with topic and theme.
 * Bug: page returned "invalid response" because the question type didn't include topic/theme,
 * causing a type error and broken build. This test ensures we load question with include
 * and render topic/theme names.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminQuestionDetailPage from "./page";

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findUnique: vi.fn() },
    topic: { findMany: vi.fn() },
    theme: { findMany: vi.fn() },
    attempt: { aggregate: vi.fn(), groupBy: vi.fn() },
    questionRating: { aggregate: vi.fn() },
    questionComment: { findMany: vi.fn() },
    questionFlag: { findMany: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.question.findUnique);
const mockTopicFindMany = vi.mocked(prisma.topic.findMany);
const mockThemeFindMany = vi.mocked(prisma.theme.findMany);
const mockAttemptAggregate = vi.mocked(prisma.attempt.aggregate);
const mockAttemptGroupBy = vi.mocked(prisma.attempt.groupBy);
const mockQuestionRatingAggregate = vi.mocked(prisma.questionRating.aggregate);
const mockQuestionCommentFindMany = vi.mocked(prisma.questionComment.findMany);
const mockQuestionFlagFindMany = vi.mocked(prisma.questionFlag.findMany);

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 4,
    slug: "design_itt_01",
    topicId: 1,
    themeId: 1,
    difficultyStep: "APPLIED",
    difficultyLevel: 3,
    dimension: null,
    question: "What is the question?",
    referenceAnswer: "The answer.",
    category: null,
    tags: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    topic: { id: 1, name: "Case Studies" },
    theme: { id: 1, name: "Design" },
    ...overrides,
  };
}

describe("Admin question detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTopicFindMany.mockResolvedValue([{ id: 1, name: "Case Studies", slug: "case-studies" }] as never);
    mockThemeFindMany.mockResolvedValue([{ id: 1, name: "Design", slug: "design" }] as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({ _count: 0, _avg: { rating: null } } as never);
    mockQuestionCommentFindMany.mockResolvedValue([] as never);
    mockQuestionFlagFindMany.mockResolvedValue([] as never);
  });

  it("renders question text and topic/theme in a single details section (no duplication)", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion() as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Case Studies");
    expect(html).toContain("Design");
    expect(html).toContain("What is the question?");
    expect(html).toContain("Edit question");
    const questionTextOccurrences = (html.match(/What is the question\?/g) ?? []).length;
    expect(questionTextOccurrences).toBe(1);
  });

  it("shows Stats block with times_asked and last asked", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion({ slug: "design_itt_01" }) as never);
    const lastAsked = new Date("2025-03-10T14:00:00Z");
    mockAttemptAggregate.mockResolvedValue({
      _count: 7,
      _max: { loggedAt: lastAsked },
    } as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Stats");
    expect(html).toContain("Times asked");
    expect(html).toContain("7");
    expect(html).toContain("Last asked");
    expect(mockAttemptAggregate).toHaveBeenCalledWith({
      where: { questionId: "design_itt_01" },
      _count: true,
      _max: { loggedAt: true },
    });
  });

  it("shows Never for last asked when question has no attempts", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion() as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Times asked");
    expect(html).toContain("0");
    expect(html).toContain("Last asked");
    expect(html).toContain("Never");
  });

  it("shows 'Question not found' when id is valid but no row exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const params = Promise.resolve({ id: "99999" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Question not found");
    expect(html).toContain("99999");
  });

  it("shows invalid id message for non-numeric id", async () => {
    mockFindUnique.mockResolvedValue(null);
    const params = Promise.resolve({ id: "not-a-number" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Invalid question id");
    expect(html).toContain("not-a-number");
  });

  it("shows Score distribution with counts 0–4 when question has attempts", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion({ slug: "design_itt_01" }) as never);
    mockAttemptAggregate.mockResolvedValue({
      _count: 10,
      _max: { loggedAt: new Date("2025-03-10T14:00:00Z") },
    } as never);
    mockAttemptGroupBy.mockResolvedValue([
      { score: 0, _count: { score: 2 } },
      { score: 2, _count: { score: 3 } },
      { score: 4, _count: { score: 5 } },
    ] as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Score distribution");
    expect(html).toContain("Attempts by score (0–4)");
    expect(html).toContain("2"); // count for score 0
    expect(html).toContain("3"); // count for score 2
    expect(html).toContain("5"); // count for score 4
    expect(mockAttemptGroupBy).toHaveBeenCalledWith({
      where: { questionId: "design_itt_01" },
      by: ["score"],
      _count: { score: true },
    });
  });

  it("shows Feedback > Ratings summary with average and count when question has ratings", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion({ id: 4, slug: "design_itt_01" }) as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({
      _count: 3,
      _avg: { rating: 4 },
    } as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Feedback");
    expect(html).toContain("Ratings summary");
    expect(html).toContain("Average 4.0");
    expect(html).toContain("3 ratings");
    expect(mockQuestionRatingAggregate).toHaveBeenCalledWith({
      where: { questionId: 4 },
      _count: true,
      _avg: { rating: true },
    });
  });

  it("shows No ratings yet when question has no ratings", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion() as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({ _count: 0, _avg: { rating: null } } as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Ratings summary");
    expect(html).toContain("No ratings yet.");
  });

  it("shows Comments (Insights) list when question has comments", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion({ id: 4 }) as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({ _count: 0, _avg: { rating: null } } as never);
    mockQuestionCommentFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "user-1",
        body: "Helpful example in the stem.",
        isOfficial: false,
        createdAt: new Date("2025-03-01T12:00:00Z"),
      },
    ] as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Comments (Insights)");
    expect(html).toContain("Helpful example in the stem.");
    expect(html).toContain("user-1");
    expect(mockQuestionCommentFindMany).toHaveBeenCalledWith({
      where: { questionId: 4, parentCommentId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, userId: true, body: true, isOfficial: true, createdAt: true },
    });
  });

  it("shows No comments yet when question has no comments", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion() as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({ _count: 0, _avg: { rating: null } } as never);
    mockQuestionCommentFindMany.mockResolvedValue([] as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Comments (Insights)");
    expect(html).toContain("No comments yet.");
  });

  it("shows Flags list with reason and notes when question has open flags", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion({ id: 4 }) as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({ _count: 0, _avg: { rating: null } } as never);
    mockQuestionCommentFindMany.mockResolvedValue([] as never);
    mockQuestionFlagFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "user-1",
        reason: "UNCLEAR",
        notes: "The stem is ambiguous.",
        createdAt: new Date("2025-03-01T12:00:00Z"),
      },
    ] as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Flags");
    expect(html).toContain("UNCLEAR");
    expect(html).toContain("The stem is ambiguous.");
    expect(html).toContain("user-1");
    expect(mockQuestionFlagFindMany).toHaveBeenCalledWith({
      where: { questionId: 4, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      select: { id: true, userId: true, reason: true, notes: true, createdAt: true },
    });
  });

  it("shows No open flags when question has no open flags", async () => {
    mockFindUnique.mockResolvedValue(makeQuestion() as never);
    mockAttemptAggregate.mockResolvedValue({ _count: 0, _max: { loggedAt: null } } as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingAggregate.mockResolvedValue({ _count: 0, _avg: { rating: null } } as never);
    mockQuestionCommentFindMany.mockResolvedValue([] as never);
    mockQuestionFlagFindMany.mockResolvedValue([] as never);
    const params = Promise.resolve({ id: "4" });
    const element = await AdminQuestionDetailPage({ params });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("Flags");
    expect(html).toContain("No open flags.");
  });
});
