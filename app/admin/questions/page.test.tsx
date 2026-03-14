/**
 * Admin questions list: topic filter uses ALL_TOPICS from lib/topics (matches scorecard).
 * With no topic param or unknown slug, shows all; with allowed slug, filters.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminQuestionsPage from "./page";
import { ALL_TOPICS } from "@/lib/topics";

vi.mock("@/lib/db", () => ({
  prisma: {
    question: { findMany: vi.fn() },
    attempt: { groupBy: vi.fn() },
    theme: { findMany: vi.fn() },
    questionRating: { groupBy: vi.fn() },
    questionFlag: { groupBy: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { prisma } from "@/lib/db";

const mockQuestionFindMany = vi.mocked(prisma.question.findMany);
const mockAttemptGroupBy = vi.mocked(prisma.attempt.groupBy);
const mockThemeFindMany = vi.mocked(prisma.theme.findMany);
const mockQuestionRatingGroupBy = vi.mocked(prisma.questionRating.groupBy);
const mockQuestionFlagGroupBy = vi.mocked(prisma.questionFlag.groupBy);

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "causal_01",
    topicId: 1,
    themeId: 1,
    difficultyStep: "STEP1_DEFINITION",
    difficultyLevel: 1,
    dimension: null,
    question: "Q1",
    referenceAnswer: null,
    category: null,
    tags: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    topic: { id: 1, name: "Causal", slug: "causal" },
    theme: { id: 1, name: "Basics", slug: "basics" },
    ...overrides,
  };
}

describe("Admin questions list page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAttemptGroupBy.mockResolvedValue([] as never);
    mockQuestionRatingGroupBy.mockResolvedValue([] as never);
    mockQuestionFlagGroupBy.mockResolvedValue([] as never);
    mockThemeFindMany.mockResolvedValue([
      { slug: "basics", name: "Basics" },
      { slug: "design", name: "Design" },
    ] as never);
  });

  it("topic filter is a dropdown with All and the five allowed topics (matches scorecard)", async () => {
    mockQuestionFindMany.mockResolvedValue([] as never);
    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);
    expect(html).toContain("<select");
    expect(html).toContain("id=\"topic-filter\"");
    expect(html).toContain("Topic:");
    expect(html).toMatch(/<option value=""[^>]*>All<\/option>/);
    for (const topic of ALL_TOPICS) {
      expect(html).toContain(topic);
    }
    expect(ALL_TOPICS).toHaveLength(5);
  });

  it("shows all active questions when no topic param", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "What is causality?", topic: { id: 1, name: "Causal", slug: "causal" } });
    const q2 = makeQuestion({ id: 2, slug: "exp_01", question: "Define A/B test.", topicId: 2, topic: { id: 2, name: "Experimentation", slug: "experimentation" } });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Question");
    expect(html).toContain("What is causality?");
    expect(html).toContain("Define A/B test.");
    expect(html).toContain("href=\"/admin/questions/1\"");
    expect(html).toContain("href=\"/admin/questions/2\"");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
        include: { topic: true, theme: true },
      })
    );
  });

  it("filters by topic when topic param is an allowed slug", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "What is causality?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ topic: "causal" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("What is causality?");
    expect(html).toContain("href=\"/admin/questions/1\"");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, topic: { slug: "causal" } },
        include: { topic: true, theme: true },
      })
    );
  });

  it("ignores unknown topic param and shows all questions", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "First?" });
    const q2 = makeQuestion({ id: 2, slug: "other_01", question: "Second?", topicId: 99, topic: { id: 99, name: "Other", slug: "other" } });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ topic: "other" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("First?");
    expect(html).toContain("Second?");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
        include: { topic: true, theme: true },
      })
    );
  });

  it("shows Times asked column and 0 when no attempts", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "What is ITT?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);
    mockAttemptGroupBy.mockResolvedValue([] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Times asked");
    expect(html).toContain("What is ITT?");
    expect(html).toContain("href=\"/admin/questions/1\"");
    expect(html).toMatch(/<td[^>]*>0<\/td>/);
  });

  it("shows correct times_asked from attempts grouped by questionId (slug)", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "Causal question?" });
    const q2 = makeQuestion({ id: 2, slug: "exp_01", question: "Exp question?" });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);
    mockAttemptGroupBy.mockResolvedValue([
      { questionId: "causal_01", _count: { questionId: 3 }, _avg: { score: 2.5 } },
      { questionId: "exp_01", _count: { questionId: 7 }, _avg: { score: 3 } },
    ] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Times asked");
    expect(html).toContain("Causal question?");
    expect(html).toContain("Exp question?");
    const causalRow = html.split("Causal question?")[1];
    const expRow = html.split("Exp question?")[1];
    expect(causalRow).toContain("3");
    expect(expRow).toContain("7");
  });

  it("sorts by times_asked descending when sort=times_asked_desc", async () => {
    const q1 = makeQuestion({ id: 1, slug: "low", question: "Low count" });
    const q2 = makeQuestion({ id: 2, slug: "high", question: "High count" });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);
    mockAttemptGroupBy.mockResolvedValue([
      { questionId: "low", _count: { questionId: 2 }, _avg: { score: 1 } },
      { questionId: "high", _count: { questionId: 5 }, _avg: { score: 3 } },
    ] as never);

    const element = await AdminQuestionsPage({
      searchParams: Promise.resolve({ sort: "times_asked_desc" }),
    });
    const html = renderToStaticMarkup(element);

    const firstRowLink = html.indexOf("href=\"/admin/questions/2\"");
    const secondRowLink = html.indexOf("href=\"/admin/questions/1\"");
    expect(firstRowLink).toBeGreaterThan(-1);
    expect(secondRowLink).toBeGreaterThan(-1);
    expect(firstRowLink).toBeLessThan(secondRowLink);
  });

  it("sorts by times_asked ascending when sort=times_asked_asc", async () => {
    const q1 = makeQuestion({ id: 1, slug: "low", question: "Low count" });
    const q2 = makeQuestion({ id: 2, slug: "high", question: "High count" });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);
    mockAttemptGroupBy.mockResolvedValue([
      { questionId: "low", _count: { questionId: 2 }, _avg: { score: 1 } },
      { questionId: "high", _count: { questionId: 5 }, _avg: { score: 3 } },
    ] as never);

    const element = await AdminQuestionsPage({
      searchParams: Promise.resolve({ sort: "times_asked_asc" }),
    });
    const html = renderToStaticMarkup(element);

    const firstRowLink = html.indexOf("href=\"/admin/questions/1\"");
    const secondRowLink = html.indexOf("href=\"/admin/questions/2\"");
    expect(firstRowLink).toBeGreaterThan(-1);
    expect(secondRowLink).toBeGreaterThan(-1);
    expect(firstRowLink).toBeLessThan(secondRowLink);
  });

  it("renders sort control (Sort dropdown)", async () => {
    mockQuestionFindMany.mockResolvedValue([] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Sort:");
    expect(html).toContain("id=\"sort-select\"");
  });

  it("Question column shows question text and links to detail page", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "What is the intent-to-treat principle?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Question");
    expect(html).toContain("What is the intent-to-treat principle?");
    expect(html).toContain("href=\"/admin/questions/1\"");
  });

  it("Question column truncates long text at 120 characters with ellipsis", async () => {
    const long = "a".repeat(150);
    const q1 = makeQuestion({ id: 1, slug: "long", question: long });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    const truncated = "a".repeat(120) + "…";
    expect(html).toContain(truncated);
    expect(html).not.toContain("a".repeat(121) + "a");
  });

  it("table has no ID column; Question is first column and links to detail; metadata columns present", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", question: "What is ITT?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).not.toMatch(/<th[^>]*>ID<\/th>/);
    expect(html).toContain(">Question</th>");
    expect(html).toContain(">Topic</th>");
    expect(html).toContain(">Theme</th>");
    expect(html).toContain(">Difficulty</th>");
    expect(html).toContain(">Times asked</th>");
    expect(html).toContain("What is ITT?");
    expect(html).toContain("href=\"/admin/questions/1\"");
  });

  it("filters by difficulty when difficulty param is 1-5", async () => {
    const q1 = makeQuestion({ id: 1, slug: "causal_01", difficultyLevel: 3, question: "Applied?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ difficulty: "3" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Applied?");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, difficultyLevel: 3 },
        include: { topic: true, theme: true },
      })
    );
  });

  it("filters by archived when active=false", async () => {
    const q1 = makeQuestion({ id: 1, slug: "archived_01", active: false, question: "Archived Q?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ active: "false" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Archived Q?");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: false },
        include: { topic: true, theme: true },
      })
    );
  });

  it("renders Difficulty and Status filter dropdowns", async () => {
    mockQuestionFindMany.mockResolvedValue([] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Difficulty:");
    expect(html).toContain("id=\"difficulty-filter\"");
    expect(html).toContain("Status:");
    expect(html).toContain("id=\"active-filter\"");
  });

  it("filters by theme when theme param is provided", async () => {
    const q1 = makeQuestion({ id: 1, slug: "design_01", theme: { id: 1, name: "Design", slug: "design" }, question: "Design Q?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ theme: "design" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Design Q?");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ theme: { slug: "design" } }),
        include: { topic: true, theme: true },
      })
    );
  });

  it("filters by dimension when dimension param is STRATEGY, INTERPRETATION, or MATH", async () => {
    const q1 = makeQuestion({ id: 1, slug: "math_01", dimension: "MATH", question: "Math Q?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ dimension: "MATH" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Math Q?");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dimension: "MATH" }),
        include: { topic: true, theme: true },
      })
    );
  });

  it("renders Theme and Dimension filter dropdowns", async () => {
    mockQuestionFindMany.mockResolvedValue([] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Theme:");
    expect(html).toContain("id=\"theme-filter\"");
    expect(html).toContain("Dimension:");
    expect(html).toContain("id=\"dimension-filter\"");
  });

  it("filters by tag when tag param is provided", async () => {
    const q1 = makeQuestion({ id: 1, slug: "q1", tags: ["gen-ai", "metrics"], question: "AI question?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({ tag: "gen-ai" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("AI question?");
    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tags: { has: "gen-ai" } }),
        include: { topic: true, theme: true },
      })
    );
  });

  it("renders tag search input", async () => {
    mockQuestionFindMany.mockResolvedValue([] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Tag:");
    expect(html).toContain("id=\"tag-search\"");
  });

  it("sorts by created_at_desc when sort=created_at_desc", async () => {
    const old = new Date("2025-01-01");
    const recent = new Date("2025-03-01");
    const q1 = makeQuestion({ id: 1, slug: "old", question: "Old?", createdAt: old });
    const q2 = makeQuestion({ id: 2, slug: "new", question: "New?", createdAt: recent });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);

    const element = await AdminQuestionsPage({
      searchParams: Promise.resolve({ sort: "created_at_desc" }),
    });
    const html = renderToStaticMarkup(element);

    const firstLink = html.indexOf("href=\"/admin/questions/2\"");
    const secondLink = html.indexOf("href=\"/admin/questions/1\"");
    expect(firstLink).toBeGreaterThan(-1);
    expect(secondLink).toBeGreaterThan(-1);
    expect(firstLink).toBeLessThan(secondLink);
  });

  it("sorts by avg_score_desc when sort=avg_score_desc", async () => {
    const q1 = makeQuestion({ id: 1, slug: "low", question: "Low score?" });
    const q2 = makeQuestion({ id: 2, slug: "high", question: "High score?" });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);
    mockAttemptGroupBy.mockResolvedValue([
      { questionId: "low", _count: { questionId: 2 }, _avg: { score: 1 } },
      { questionId: "high", _count: { questionId: 2 }, _avg: { score: 4 } },
    ] as never);

    const element = await AdminQuestionsPage({
      searchParams: Promise.resolve({ sort: "avg_score_desc" }),
    });
    const html = renderToStaticMarkup(element);

    const firstLink = html.indexOf("href=\"/admin/questions/2\"");
    const secondLink = html.indexOf("href=\"/admin/questions/1\"");
    expect(firstLink).toBeGreaterThan(-1);
    expect(secondLink).toBeGreaterThan(-1);
    expect(firstLink).toBeLessThan(secondLink);
  });

  it("sorts by avg_rating_desc when sort=avg_rating_desc", async () => {
    const q1 = makeQuestion({ id: 1, slug: "a", question: "A?" });
    const q2 = makeQuestion({ id: 2, slug: "b", question: "B?" });
    mockQuestionFindMany.mockResolvedValue([q1, q2] as never);
    mockQuestionRatingGroupBy.mockResolvedValue([
      { questionId: 1, _avg: { rating: 2 } },
      { questionId: 2, _avg: { rating: 5 } },
    ] as never);

    const element = await AdminQuestionsPage({
      searchParams: Promise.resolve({ sort: "avg_rating_desc" }),
    });
    const html = renderToStaticMarkup(element);

    const firstLink = html.indexOf("href=\"/admin/questions/2\"");
    const secondLink = html.indexOf("href=\"/admin/questions/1\"");
    expect(firstLink).toBeGreaterThan(-1);
    expect(secondLink).toBeGreaterThan(-1);
    expect(firstLink).toBeLessThan(secondLink);
  });

  it("shows Avg score, Avg rating, and Flags columns with correct values", async () => {
    const q1 = makeQuestion({ id: 1, slug: "q1", question: "Question one?" });
    mockQuestionFindMany.mockResolvedValue([q1] as never);
    mockAttemptGroupBy.mockResolvedValue([
      { questionId: "q1", _count: { questionId: 4 }, _avg: { score: 2.5 } },
    ] as never);
    mockQuestionRatingGroupBy.mockResolvedValue([
      { questionId: 1, _avg: { rating: 4 } },
    ] as never);
    mockQuestionFlagGroupBy.mockResolvedValue([
      { questionId: 1, _count: { questionId: 2 } },
    ] as never);

    const element = await AdminQuestionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Avg score");
    expect(html).toContain("Avg rating");
    expect(html).toContain("Flags");
    expect(html).toContain("2.5");
    expect(html).toContain("4.0");
    expect(html).toContain("2");
  });
});
