import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildHistorySummary,
  generateInsights,
} from "@/lib/insights-llm";
import {
  buildWeakAreaSeedText,
  getRelatedQuestionsByText,
} from "@/lib/insights-rag";
import type { AttemptForInsights, RAGCandidateQuestion } from "@/lib/insights-types";

const MIN_ATTEMPTS = 5;
const MAX_ATTEMPTS_FOR_SUMMARY = 100;

/** Compute weakest topics by average score (ascending) */
function weakestTopics(attempts: AttemptForInsights[], count: number): string[] {
  const byTopic: Record<string, { score: number; max: number }> = {};
  for (const a of attempts) {
    const t = a.topic || "Other";
    if (!byTopic[t]) byTopic[t] = { score: 0, max: 0 };
    byTopic[t].score += a.score;
    byTopic[t].max += a.maxScore;
  }
  const withAvg = Object.entries(byTopic).map(([topic, d]) => ({
    topic,
    avg: d.max ? d.score / d.max : 0,
  }));
  withAvg.sort((a, b) => a.avg - b.avg);
  return withAvg.slice(0, count).map((x) => x.topic);
}

/** Get slugs the user has already answered (effective question id = followUpId ?? questionId) */
function getAnsweredSlugs(attempts: AttemptForInsights[]): string[] {
  const set = new Set<string>();
  for (const a of attempts) {
    if (a.questionId === "custom") continue;
    set.add(a.followUpId ?? a.questionId);
  }
  return [...set];
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id },
      select: {
        questionId: true,
        followUpId: true,
        topic: true,
        theme: true,
        difficulty: true,
        score: true,
        maxScore: true,
        questionText: true,
        answer: true,
        loggedAt: true,
      },
      orderBy: { loggedAt: "desc" },
      take: MAX_ATTEMPTS_FOR_SUMMARY,
    });

    const attemptList: AttemptForInsights[] = attempts.map((a) => ({
      questionId: a.questionId,
      followUpId: a.followUpId,
      topic: a.topic,
      theme: a.theme,
      difficulty: a.difficulty,
      score: a.score,
      maxScore: a.maxScore,
      questionText: a.questionText,
      answer: a.answer,
      loggedAt: a.loggedAt,
    }));

    if (attemptList.length < MIN_ATTEMPTS) {
      return NextResponse.json({
        hasEnoughData: false,
        attemptCount: attemptList.length,
        minAttempts: MIN_ATTEMPTS,
      });
    }

    const historySummary = buildHistorySummary(attemptList);
    const weakTopics = weakestTopics(attemptList, 3);
    const sampleQuestionTexts = attemptList
      .filter((a) => a.score <= 2 && a.questionText)
      .slice(0, 5)
      .map((a) => a.questionText!);
    const seedText = buildWeakAreaSeedText(weakTopics, sampleQuestionTexts);
    const answeredSlugs = getAnsweredSlugs(attemptList);

    let relatedRows: Awaited<ReturnType<typeof getRelatedQuestionsByText>> = [];
    try {
      relatedRows = await getRelatedQuestionsByText(seedText, answeredSlugs, 15);
    } catch (e) {
      console.error("Insights RAG error:", e);
    }

    let candidates: RAGCandidateQuestion[] = relatedRows.map((r) => ({
      slug: r.slug,
      question: r.question ?? "",
      topic: r.topic_name ?? "General",
      level: r.difficulty_level ?? 1,
    }));

    // If RAG returned no candidates (e.g. no embeddings or all excluded), fall back to questions from DB
    if (candidates.length === 0) {
      const fallbackRows = await prisma.question.findMany({
        where: { active: true },
        select: { slug: true, question: true, difficultyLevel: true, topic: { select: { name: true } } },
        take: 20,
      });
      const excludeSet = new Set(answeredSlugs);
      candidates = fallbackRows
        .filter((q) => !excludeSet.has(q.slug))
        .map((q) => ({
          slug: q.slug,
          question: q.question,
          topic: q.topic?.name ?? "General",
          level: q.difficultyLevel ?? 1,
        }))
        .slice(0, 15);
    }

    let insights = await generateInsights(historySummary, candidates);
    if (!insights) {
      // Fallback: minimal structured response so UI doesn't break
      insights = {
        summary: "We couldn't generate personalized insights right now. Keep practicing and check back soon.",
        strengths: [],
        improvement_areas: [],
        patterns: [],
        next_steps: ["Continue practicing a few more questions.", "Revisit the Scorecard to see accuracy by topic."],
        recommended_questions: [],
      };
    }

    const questionDetails: Record<string, { question: string; topic: string; level: number }> = {};
    for (const c of candidates) {
      questionDetails[c.slug] = { question: c.question, topic: c.topic, level: c.level };
    }
    for (const r of insights.recommended_questions ?? []) {
      if (r.question_id && !questionDetails[r.question_id]) {
        questionDetails[r.question_id] = {
          question: r.question_text,
          topic: r.topic,
          level: r.level,
        };
      }
    }

    // Pad to 5 "questions to learn" from candidates so the user always has up to 5 clickable items
    const recommended = insights.recommended_questions ?? [];
    const recommendedIds = new Set(recommended.map((r) => r.question_id));
    if (recommended.length < 5 && candidates.length > 0) {
      for (const c of candidates) {
        if (recommendedIds.has(c.slug)) continue;
        recommended.push({
          question_id: c.slug,
          question_text: c.question,
          why_recommended: "Related to areas you could strengthen.",
          topic: c.topic,
          level: c.level,
        });
        recommendedIds.add(c.slug);
        if (recommended.length >= 5) break;
      }
      insights = { ...insights, recommended_questions: recommended };
    }

    // Pad each improvement_area to 5 recommended_question_slugs: first topic-matching, then any candidates
    const areas = insights.improvement_areas ?? [];
    for (const area of areas) {
      let slugs = [...(area.recommended_question_slugs ?? [])];
      const used = new Set(slugs);
      const topicLower = area.topic.trim().toLowerCase();

      if (slugs.length < 5 && candidates.length > 0) {
        // First: add candidates that match this area's topic (e.g. "Causal")
        for (const c of candidates) {
          if (used.has(c.slug)) continue;
          if (c.topic.trim().toLowerCase() !== topicLower) continue;
          slugs.push(c.slug);
          used.add(c.slug);
          if (!questionDetails[c.slug]) {
            questionDetails[c.slug] = { question: c.question, topic: c.topic, level: c.level };
          }
          if (slugs.length >= 5) break;
        }
        // If still fewer than 5, add any remaining candidates so the block always has questions
        if (slugs.length < 5) {
          for (const c of candidates) {
            if (used.has(c.slug)) continue;
            slugs.push(c.slug);
            used.add(c.slug);
            if (!questionDetails[c.slug]) {
              questionDetails[c.slug] = { question: c.question, topic: c.topic, level: c.level };
            }
            if (slugs.length >= 5) break;
          }
        }
      }
      if (slugs.length > 0) {
        (area as { recommended_question_slugs?: string[] }).recommended_question_slugs = slugs;
      }
    }

    return NextResponse.json({
      hasEnoughData: true,
      attemptCount: attemptList.length,
      insights,
      questionDetails,
    });
  } catch (err) {
    console.error("GET /api/insights error:", err);
    return NextResponse.json(
      { error: "Failed to load insights" },
      { status: 500 }
    );
  }
}
