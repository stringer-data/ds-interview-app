import Link from "next/link";
import { prisma } from "@/lib/db";
import { ALL_TOPICS, topicToSlug } from "@/lib/topics";
import { QuestionEditForm } from "./QuestionEditForm";
import { RelatedQuestionsSection } from "./RelatedQuestionsSection";

const ALLOWED_SLUGS = ALL_TOPICS.map((t) => topicToSlug(t));

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminQuestionDetailPage({ params, searchParams }: Props) {
  let id: string;
  let idNum: number;
  try {
    const resolved = await params;
    id = resolved.id;
    idNum = Number(id);
  } catch (e) {
    return (
      <section className="card">
        <h2 style={{ fontSize: "1.1rem" }}>Error</h2>
        <p style={{ color: "var(--muted)" }}>Invalid params.</p>
        <Link href="/admin/questions" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          Back to questions
        </Link>
      </section>
    );
  }
  if (!Number.isFinite(idNum)) {
    return (
      <section className="card">
        <h2 style={{ fontSize: "1.1rem" }}>Question: {id}</h2>
        <p style={{ color: "var(--muted)" }}>
          Invalid question id <code>{id}</code>.
        </p>
        <Link href="/admin/questions" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          Back to questions
        </Link>
      </section>
    );
  }

  let question: Awaited<
    ReturnType<typeof prisma.question.findUnique>
  > & { topic: { id: number; name: string }; theme: { id: number; name: string } } | null = null;
  let topics: { id: number; name: string; slug: string }[] = [];
  let themes: { id: number; name: string; slug: string }[] = [];
  try {
    const [q, topicsList, themesList] = await Promise.all([
      prisma.question.findUnique({
        where: { id: idNum },
        include: { topic: true, theme: true },
      }),
      prisma.topic.findMany({
        where: { slug: { in: ALLOWED_SLUGS } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.theme.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);
    question = q;
    topics = topicsList;
    themes = themesList;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <section className="card">
        <h2 style={{ fontSize: "1.1rem" }}>Error</h2>
        <p style={{ color: "var(--error, #c00)" }}>Failed to load question: {msg}</p>
        <Link href="/admin/questions" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          Back to questions
        </Link>
      </section>
    );
  }

  let timesAsked = 0;
  let lastAsked: Date | null = null;
  let scoreDistribution: { score: number; count: number }[] = [];
  let ratingsCount = 0;
  let ratingsAvg: number | null = null;
  let comments: { id: number; userId: string; body: string; isOfficial: boolean; createdAt: Date }[] = [];
  let openFlags: { id: number; userId: string; reason: string; notes: string | null; createdAt: Date }[] = [];
  let statsError: string | null = null;
  let embeddingIndexed = false;
  let embeddingUpdatedAt: Date | null = null;
  let embeddingModelVersion: string | null = null;
  if (question) {
    try {
      const [agg, scoreByScore, ratingsAgg, commentsList, flagsList, embeddingRow] = await Promise.all([
        prisma.attempt.aggregate({
          where: { questionId: question.slug },
          _count: true,
          _max: { loggedAt: true },
        }),
        prisma.attempt.groupBy({
          where: { questionId: question.slug },
          by: ["score"],
          _count: { score: true },
        }),
        prisma.questionRating.aggregate({
          where: { questionId: question.id },
          _count: true,
          _avg: { rating: true },
        }),
        prisma.questionComment.findMany({
          where: { questionId: question.id, parentCommentId: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, userId: true, body: true, isOfficial: true, createdAt: true },
        }),
        prisma.questionFlag.findMany({
          where: { questionId: question.id, status: "OPEN" },
          orderBy: { createdAt: "desc" },
          select: { id: true, userId: true, reason: true, notes: true, createdAt: true },
        }),
        prisma.$queryRawUnsafe<{ model_version: string; updated_at: Date }[]>(
          `SELECT model_version, updated_at FROM "QuestionEmbedding" WHERE question_id = $1 LIMIT 1`,
          question.id
        ),
      ]);
      timesAsked = agg._count;
      lastAsked = agg._max.loggedAt;
      const countByScore = new Map(scoreByScore.map((r) => [r.score, r._count.score]));
      scoreDistribution = [0, 1, 2, 3, 4].map((score) => ({
        score,
        count: countByScore.get(score) ?? 0,
      }));
      ratingsCount = ratingsAgg._count;
      ratingsAvg = ratingsAgg._avg.rating ?? null;
      comments = commentsList;
      openFlags = flagsList;
      const row = embeddingRow?.[0];
      if (row) {
        embeddingIndexed = true;
        embeddingUpdatedAt = row.updated_at ?? null;
        embeddingModelVersion = row.model_version ?? null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      statsError = msg;
    }
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showCreatedBanner =
    question &&
    resolvedSearchParams &&
    (resolvedSearchParams.created === "1" || resolvedSearchParams.created?.[0] === "1");

  return (
    <section className="card">
      {showCreatedBanner && (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius, 6px)",
            background: embeddingIndexed ? "var(--success-bg, #e8f5e9)" : "var(--warning-bg, #fff3e0)",
            border: `1px solid ${embeddingIndexed ? "var(--success-border, #a5d6a7)" : "var(--warning-border, #ffcc80)"}`,
            fontSize: "0.9rem",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            Question created.
          </p>
          <p style={{ margin: "0.25rem 0 0 0" }}>
            {embeddingIndexed
              ? "Successfully indexed for related questions."
              : "Not indexed — embedding failed. Check Embedding status below or run the backfill script."}
          </p>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem" }}>
          Question: {question ? question.slug ?? question.id : idNum}
        </h2>
        <Link href="/admin/questions" className="btn btn-ghost">
          Back to questions
        </Link>
      </div>

      {!question ? (
        <p style={{ color: "var(--muted)" }}>
          Question not found for id <code>{idNum}</code>.
        </p>
      ) : (
        <>
          <RelatedQuestionsSection questionId={question.id} />
          <section style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "var(--muted)" }}>Embedding status</h3>
            {statsError ? (
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
                Unknown (stats failed to load).
              </p>
            ) : embeddingIndexed ? (
              <>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  <strong>Indexed:</strong> Yes
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
                  <strong>Model:</strong> {embeddingModelVersion ?? "—"}
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
                  <strong>Last indexed:</strong>{" "}
                  {embeddingUpdatedAt
                    ? embeddingUpdatedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                    : "—"}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
                <strong>Not indexed</strong> (run the backfill to populate embeddings).
              </p>
            )}
          </section>
          <section style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "var(--muted)" }}>Stats</h3>
            {statsError ? (
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--error, #c00)" }}>{statsError}</p>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  <strong>Times asked:</strong> {timesAsked}
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
                  <strong>Last asked:</strong> {lastAsked ? lastAsked.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                </p>
              </>
            )}
          </section>
          {!statsError && (
            <section style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "var(--muted)" }}>Feedback</h3>
              <h4 style={{ fontSize: "0.95rem", margin: "0 0 0.35rem 0", fontWeight: 600 }}>Ratings summary</h4>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                {ratingsCount === 0
                  ? "No ratings yet."
                  : `Average ${ratingsAvg != null ? ratingsAvg.toFixed(1) : "—"} (${ratingsCount} rating${ratingsCount === 1 ? "" : "s"})`}
              </p>
              <h4 style={{ fontSize: "0.95rem", margin: "1rem 0 0.35rem 0", fontWeight: 600 }}>Comments (Insights)</h4>
              {comments.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>No comments yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                  {comments.map((c) => (
                    <li key={c.id} style={{ marginBottom: "0.5rem" }}>
                      <span style={{ color: "var(--muted)" }}>
                        {c.isOfficial ? "[Official] " : ""}{c.userId} · {c.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <br />
                      {c.body}
                    </li>
                  ))}
                </ul>
              )}
              <h4 style={{ fontSize: "0.95rem", margin: "1rem 0 0.35rem 0", fontWeight: 600 }}>Flags</h4>
              {openFlags.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>No open flags.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                  {openFlags.map((f) => (
                    <li key={f.id} style={{ marginBottom: "0.5rem" }}>
                      <span style={{ color: "var(--muted)" }}>
                        {f.userId} · {f.reason} · {f.createdAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      {f.notes && (
                        <>
                          <br />
                          {f.notes}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {!statsError && scoreDistribution.length > 0 && (
            <section style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "var(--muted)" }}>Score distribution</h3>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                Attempts by score (0–4)
              </p>
              <div style={{ maxWidth: "20rem" }}>
                {scoreDistribution.map(({ score, count }) => {
                  const maxCount = Math.max(...scoreDistribution.map((d) => d.count), 1);
                  const pct = (count / maxCount) * 100;
                  return (
                    <div
                      key={score}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span style={{ width: "1.5rem" }}>{score}</span>
                      <div
                        style={{
                          flex: 1,
                          height: "1.25rem",
                          background: "var(--border, #eee)",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: "var(--primary, #333)",
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                      <span style={{ width: "2rem", textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <QuestionEditForm
          questionId={question.id}
          topicName={question.topic.name}
          themeName={question.theme.name}
          initialTopicId={question.topicId}
          initialThemeId={question.themeId}
          topics={topics}
          themes={themes}
          initialQuestion={question.question ?? ""}
          initialReferenceAnswer={question.referenceAnswer ?? null}
          initialDifficultyLevel={question.difficultyLevel}
          initialActive={question.active}
          initialCategory={question.category ?? null}
          initialTags={question.tags ?? []}
        />
        </>
      )}
    </section>
  );
}

