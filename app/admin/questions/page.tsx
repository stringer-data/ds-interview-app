import Link from "next/link";
import { prisma } from "@/lib/db";
import { ALL_TOPICS, topicToSlug } from "@/lib/topics";
import { ActiveFilterSelect } from "./ActiveFilterSelect";
import { DimensionFilterSelect } from "./DimensionFilterSelect";
import { DifficultyFilterSelect } from "./DifficultyFilterSelect";
import { SortSelect, type SortValue } from "./SortSelect";
import { TagSearchInput } from "./TagSearchInput";
import { ThemeFilterSelect } from "./ThemeFilterSelect";
import { TopicFilterSelect } from "./TopicFilterSelect";

type Props = {
  searchParams: Promise<{
    topic?: string | string[];
    sort?: string | string[];
    difficulty?: string | string[];
    active?: string | string[];
    theme?: string | string[];
    dimension?: string | string[];
    tag?: string | string[];
  }>;
};

const ALLOWED_DIMENSIONS = ["STRATEGY", "INTERPRETATION", "MATH"] as const;

const ALLOWED_SLUGS = ALL_TOPICS.map((t) => topicToSlug(t));
const ALLOWED_SORT: SortValue[] = [
  "",
  "times_asked_asc",
  "times_asked_desc",
  "created_at_asc",
  "created_at_desc",
  "avg_score_asc",
  "avg_score_desc",
  "avg_rating_asc",
  "avg_rating_desc",
];
const QUESTION_PREVIEW_LENGTH = 120;

function truncateQuestion(text: string): string {
  if (text.length <= QUESTION_PREVIEW_LENGTH) return text;
  return text.slice(0, QUESTION_PREVIEW_LENGTH) + "…";
}

export default async function AdminQuestionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const topicSlugParam = typeof params.topic === "string" ? params.topic : params.topic?.[0];
  const topicSlug = topicSlugParam && ALLOWED_SLUGS.includes(topicSlugParam) ? topicSlugParam : undefined;
  const sortParam = typeof params.sort === "string" ? params.sort : params.sort?.[0];
  const sort: SortValue = sortParam && ALLOWED_SORT.includes(sortParam as SortValue) ? (sortParam as SortValue) : "";
  const difficultyParam = typeof params.difficulty === "string" ? params.difficulty : params.difficulty?.[0];
  const difficulty =
    difficultyParam != null && /^[1-5]$/.test(difficultyParam) ? Number(difficultyParam) : undefined;
  const activeParam = typeof params.active === "string" ? params.active : params.active?.[0];
  const activeFilter: boolean | undefined =
    activeParam === "false" ? false : activeParam === "all" ? undefined : true; // default active only; undefined = all
  const themeParam = typeof params.theme === "string" ? params.theme : params.theme?.[0];
  const dimensionParam = typeof params.dimension === "string" ? params.dimension : params.dimension?.[0];
  const themeSlug = themeParam && themeParam.trim() !== "" ? themeParam : undefined;
  const dimension: "STRATEGY" | "INTERPRETATION" | "MATH" | undefined =
    dimensionParam && ALLOWED_DIMENSIONS.includes(dimensionParam as (typeof ALLOWED_DIMENSIONS)[number])
      ? (dimensionParam as "STRATEGY" | "INTERPRETATION" | "MATH")
      : undefined;
  const tagParam = typeof params.tag === "string" ? params.tag : params.tag?.[0];
  const tagSearch = tagParam?.trim() ? tagParam.trim() : undefined;

  const [themes, questions] = await Promise.all([
    prisma.theme.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    prisma.question.findMany({
      where: {
        ...(topicSlug ? { topic: { slug: topicSlug } } : {}),
        ...(difficulty !== undefined ? { difficultyLevel: difficulty } : {}),
        ...(activeFilter !== undefined ? { active: activeFilter } : {}),
        ...(themeSlug ? { theme: { slug: themeSlug } } : {}),
        ...(dimension ? { dimension } : {}),
        ...(tagSearch ? { tags: { has: tagSearch } } : {}),
      },
      include: { topic: true, theme: true },
      orderBy: [
        { topic: { name: "asc" } },
        { difficultyLevel: "asc" },
        { slug: "asc" },
      ],
    }),
  ]);

  const [attemptStats, ratingStats, flagCounts] = await Promise.all([
    prisma.attempt.groupBy({
      by: ["questionId"],
      _count: { questionId: true },
      _avg: { score: true },
    }),
    prisma.questionRating.groupBy({
      by: ["questionId"],
      _avg: { rating: true },
    }),
    prisma.questionFlag.groupBy({
      by: ["questionId"],
      _count: { questionId: true },
    }),
  ]);
  const countBySlug = new Map(attemptStats.map((r) => [r.questionId, r._count.questionId]));
  const avgScoreBySlug = new Map(
    attemptStats.map((r) => [r.questionId, r._avg.score != null ? r._avg.score : null])
  );
  const avgRatingByQuestionId = new Map(
    ratingStats.map((r) => [r.questionId, r._avg.rating != null ? r._avg.rating : null])
  );
  const flagsCountByQuestionId = new Map(flagCounts.map((r) => [r.questionId, r._count.questionId]));

  type QuestionWithStats = (typeof questions)[number] & {
    timesAsked: number;
    avgScore: number | null;
    avgRating: number | null;
    flagsCount: number;
  };
  const withStats: QuestionWithStats[] = questions.map((q) => ({
    ...q,
    timesAsked: countBySlug.get(q.slug) ?? 0,
    avgScore: avgScoreBySlug.get(q.slug) ?? null,
    avgRating: avgRatingByQuestionId.get(q.id) ?? null,
    flagsCount: flagsCountByQuestionId.get(q.id) ?? 0,
  }));

  const sorted = (() => {
    const list = [...withStats];
    if (sort === "times_asked_desc") return list.sort((a, b) => b.timesAsked - a.timesAsked);
    if (sort === "times_asked_asc") return list.sort((a, b) => a.timesAsked - b.timesAsked);
    if (sort === "created_at_desc") return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (sort === "created_at_asc") return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const score = (q: QuestionWithStats) => q.avgScore ?? 0;
    if (sort === "avg_score_desc") return list.sort((a, b) => score(b) - score(a));
    if (sort === "avg_score_asc") return list.sort((a, b) => score(a) - score(b));
    const rating = (q: QuestionWithStats) => q.avgRating ?? 0;
    if (sort === "avg_rating_desc") return list.sort((a, b) => rating(b) - rating(a));
    if (sort === "avg_rating_asc") return list.sort((a, b) => rating(a) - rating(b));
    return withStats;
  })();

  return (
    <section className="card">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Questions</h2>
        <TopicFilterSelect currentTopicSlug={topicSlug} />
        <ThemeFilterSelect
          themes={themes}
          currentThemeSlug={themeSlug}
          topicSlug={topicSlug}
          sort={sort}
          difficulty={difficulty}
          activeFilter={activeFilter}
          dimension={dimension}
        />
        <DimensionFilterSelect
          currentDimension={dimension}
          topicSlug={topicSlug}
          themeSlug={themeSlug}
          sort={sort}
          difficulty={difficulty}
          activeFilter={activeFilter}
        />
        <TagSearchInput
          currentTag={tagSearch}
          topicSlug={topicSlug}
          themeSlug={themeSlug}
          sort={sort}
          difficulty={difficulty}
          activeFilter={activeFilter}
          dimension={dimension}
        />
        <DifficultyFilterSelect
          currentDifficulty={difficulty}
          topicSlug={topicSlug}
          sort={sort}
          activeFilter={activeFilter}
        />
        <ActiveFilterSelect
          currentActive={activeFilter}
          topicSlug={topicSlug}
          sort={sort}
          difficulty={difficulty}
        />
        <SortSelect
          currentSort={sort}
          topicSlug={topicSlug}
          themeSlug={themeSlug}
          difficulty={difficulty}
          activeFilter={activeFilter}
          dimension={dimension}
          tagSearch={tagSearch}
        />
        <Link href="/admin/questions/new" className="btn btn-primary" style={{ marginLeft: "auto" }}>
          Create question
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No questions found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <colgroup>
              <col style={{ width: "50%" }} />
              <col span={8} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.75rem" }}>Question</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Topic</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Theme</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Difficulty</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Times asked</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Avg score</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Avg rating</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Flags</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((q) => (
                <tr key={q.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td
                    style={{
                      padding: "0.5rem 0.75rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Link
                      href={`/admin/questions/${q.id}`}
                      style={{ color: "var(--text)", textDecoration: "underline" }}
                    >
                      {truncateQuestion(q.question)}
                    </Link>
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>{q.topic.name}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>{q.theme.name}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>{q.difficultyLevel}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>{q.timesAsked}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                    {q.avgScore != null ? q.avgScore.toFixed(1) : "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                    {q.avgRating != null ? q.avgRating.toFixed(1) : "—"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>{q.flagsCount}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>{q.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

