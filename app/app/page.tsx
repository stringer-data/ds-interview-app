"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { topicFromSlug } from "@/lib/topics";

type Scorecard = {
  tier: string;
  questionsUsed: number;
  questionsLeft: number | null;
  totalPoints: number;
  maxPoints: number;
  overallPct: number;
  todayPoints: number;
  todayMax: number;
  todayPct: number;
  questionsAnsweredToday: number;
  streak: number;
  accuracyByTopic: Record<string, number>;
};

type Question = {
  questionId: string;
  followUpId: string | null;
  questionDisplayId: string;
  topic: string;
  theme: string;
  difficulty: number;
  question: string;
  reference_answer?: string;
};

type Feedback = {
  score: number;
  maxScore: number;
  verdict: string;
  whatWasGood: string;
  missingWrong: string;
  exampleAnswers: string;
  followUpQuestion: string;
  questionsUsed: number;
  upsell: boolean;
  nextQuestion: Question | null;
};

export default function AppPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicSlug = searchParams.get("topic");
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [upsell, setUpsell] = useState<{ questionsUsed: number; cap: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const fetchScorecard = useCallback(async () => {
    const tz = typeof Intl !== "undefined" && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    const res = await fetch(`/api/scorecard?timezone=${encodeURIComponent(tz)}`);
    if (res.ok) {
      const data = await res.json();
      setScorecard(data);
    }
  }, []);

  const fetchNextQuestion = useCallback(
    async (randomTopic = false) => {
      const params = new URLSearchParams();
      if (randomTopic) params.set("random_topic", "true");
      else if (topicSlug) params.set("topic", topicSlug);
      const url = "/api/next-question" + (params.toString() ? "?" + params.toString() : "");
      const res = await fetch(url);
      const data = await res.json();
      if (data.upsell) {
        setUpsell({ questionsUsed: data.questionsUsed, cap: data.cap });
        setQuestion(null);
        return;
      }
      if (data.error === "no_questions") {
        setQuestion(null);
        return;
      }
      setUpsell(null);
      setQuestion(data);
      setAnswer("");
      setFeedback(null);
      setFollowUpAnswer("");
      setHint(null);
    },
    [topicSlug]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchScorecard();
      if (cancelled) return;
      await fetchNextQuestion();
      if (cancelled) return;
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchScorecard, fetchNextQuestion]);

  async function handleNext() {
    setActionLoading(true);
    await fetchScorecard();
    await fetchNextQuestion(false);
    setActionLoading(false);
  }

  async function handleHelp() {
    if (!question) return;
    setActionLoading(true);
    setHint(null);
    try {
      const res = await fetch(`/api/help?question_id=${encodeURIComponent(question.questionDisplayId)}`);
      const data = await res.json();
      if (data.hint) setHint(data.hint);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !answer.trim()) return;
    setActionLoading(true);
    setFeedback(null);
    setHint(null);
    try {
      const res = await fetch("/api/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.questionId,
          follow_up_id: question.followUpId,
          answer: answer.trim(),
          ...(question.questionId === "custom" && {
            custom_question: question.question,
            custom_topic: question.topic,
          }),
        }),
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        setFeedback({
          score: 0,
          maxScore: 4,
          verdict: "Something went wrong",
          whatWasGood: "—",
          missingWrong: "Could not read the response. Please try again.",
          exampleAnswers: "—",
          followUpQuestion: "—",
          questionsUsed: 0,
          upsell: false,
          nextQuestion: null,
        });
        return;
      }
      if (!res.ok) {
        const obj = data && typeof data === "object" ? (data as { error?: string; errorDetail?: string }) : {};
        const errMsg = typeof obj.error === "string" ? obj.error : "Please try again.";
        const detail = typeof obj.errorDetail === "string" ? ` (${obj.errorDetail})` : "";
        setFeedback({
          score: 0,
          maxScore: 4,
          verdict: "Error",
          whatWasGood: "—",
          missingWrong: errMsg + detail,
          exampleAnswers: "—",
          followUpQuestion: "—",
          questionsUsed: 0,
          upsell: false,
          nextQuestion: null,
        });
        return;
      }
      const feedbackData = data as Feedback;
      setLastTopic(question.topic);
      setFeedback(feedbackData);
      await fetchScorecard();
      if (feedbackData.upsell && !feedbackData.nextQuestion) {
        setUpsell({ questionsUsed: feedbackData.questionsUsed, cap: 10 });
        setQuestion(null);
      } else if (feedbackData.nextQuestion) {
        setQuestion(feedbackData.nextQuestion);
        setAnswer("");
      } else {
        await fetchNextQuestion();
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  if (upsell) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>You’ve used {upsell.questionsUsed} questions</h2>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          Unlock unlimited practice — go paid. (Phase 1: payments coming soon.)
        </p>
        <button className="btn btn-primary" disabled>
          Upgrade (coming soon)
        </button>
      </div>
    );
  }

  return (
    <>
      {scorecard && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.9rem" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginRight: "0.5rem" }}>
              {scorecard.tier === "paid" ? "Paid plan" : "Free plan"}
            </span>
            <span>
              <strong>Streak:</strong> {scorecard.streak} {scorecard.streak === 1 ? "day" : "days"}
            </span>
            <span>
              <strong>Today:</strong> {scorecard.questionsAnsweredToday} {scorecard.questionsAnsweredToday === 1 ? "question" : "questions"}
            </span>
            <span>
              <strong>Score today:</strong> {scorecard.todayMax ? `${scorecard.todayPoints}/${scorecard.todayMax} (${Math.round(scorecard.todayPct * 100)}%)` : "—"}
            </span>
          </div>
        </div>
      )}

      {hint && (
        <div
          className="card"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, fontSize: "0.8rem", color: "var(--muted)" }}>
            Hint
          </p>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{hint}</p>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: "0.5rem", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
            onClick={() => setHint(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {!question && !feedback && !upsell && (
        <p style={{ color: "var(--muted)" }}>No questions available. Check QUESTIONS_PATH.</p>
      )}

      {question && !feedback && (
        <div className="card">
          {topicSlug && topicFromSlug(topicSlug) && (
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
              Practicing: {topicFromSlug(topicSlug)} · <Link href="/app" style={{ color: "var(--muted)" }}>all topics</Link>
            </p>
          )}
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            {question.topic} · {question.theme} · Difficulty {question.difficulty}
          </p>
          <p style={{ marginBottom: "1rem", whiteSpace: "pre-wrap" }}>{question.question}</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="answer">Your answer</label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer…"
                required
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? "Submitting…" : "Submit"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleHelp}
                disabled={actionLoading}
              >
                Help
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleNext}
                disabled={actionLoading}
              >
                Next question
              </button>
            </div>
          </form>
        </div>
      )}

      {feedback && (
        <div className="card feedback-card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.15rem" }}>
              Score: {feedback.score}/{feedback.maxScore} — {feedback.verdict}
            </h3>
          </div>

          <section style={{ marginBottom: "1.25rem" }}>
            <h4 className="feedback-label">What was good</h4>
            <p className="feedback-text">{feedback.whatWasGood}</p>
          </section>

          <section style={{ marginBottom: "1.25rem" }}>
            <h4 className="feedback-label">Missing / wrong</h4>
            <p className="feedback-text">{feedback.missingWrong}</p>
          </section>

          {feedback.exampleAnswers && feedback.exampleAnswers.trim() !== "—" && (
            <section style={{ marginBottom: "1.25rem" }}>
              <h4 className="feedback-label">Example answers</h4>
              <pre className="feedback-block">{feedback.exampleAnswers}</pre>
            </section>
          )}

          {feedback.followUpQuestion && feedback.followUpQuestion.trim() !== "—" && (
            <section style={{ marginBottom: "1.25rem" }}>
              <h4 className="feedback-label">Suggested follow-up</h4>
              <p className="feedback-text">{feedback.followUpQuestion}</p>
              <textarea
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                placeholder="Type your answer here"
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  resize: "vertical",
                  marginTop: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              />
            </section>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {feedback.followUpQuestion && feedback.followUpQuestion.trim() !== "—" && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading || !followUpAnswer.trim()}
                onClick={async () => {
                  const text = followUpAnswer.trim();
                  if (!text || !feedback.followUpQuestion) return;
                  setActionLoading(true);
                  setFollowUpAnswer("");
                  try {
                    const res = await fetch("/api/submit-answer", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        question_id: "custom",
                        custom_question: feedback.followUpQuestion,
                        custom_topic: lastTopic ?? "Custom",
                        answer: text,
                      }),
                    });
                    const responseData = await res.json().catch(() => null);
                    if (!res.ok) {
                      const errMsg = responseData?.error ?? "Please try again.";
                      setFeedback((prev) => prev ? { ...prev, verdict: "Error", missingWrong: errMsg } : null);
                      return;
                    }
                      const feedbackData = responseData as Feedback;
                      setLastTopic(lastTopic ?? "Custom");
                      setFeedback(feedbackData);
                      setHint(null);
                      await fetchScorecard();
                      if (feedbackData.upsell && !feedbackData.nextQuestion) {
                        setUpsell({ questionsUsed: feedbackData.questionsUsed, cap: 10 });
                        setQuestion(null);
                      } else if (feedbackData.nextQuestion) {
                        setQuestion(feedbackData.nextQuestion);
                        setAnswer("");
                      } else {
                        await fetchNextQuestion();
                      }
                    } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Submit answer
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                setFeedback(null);
                setFollowUpAnswer("");
                if (topicSlug) router.replace("/app");
                await fetchNextQuestion(true);
                setActionLoading(false);
              }}
            >
              New random topic
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleHelp}
              disabled={actionLoading || !question}
            >
              Help
            </button>
            {feedback.nextQuestion ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setQuestion(feedback!.nextQuestion!);
                  setAnswer("");
                  setFeedback(null);
                  setFollowUpAnswer("");
                  setHint(null);
                }}
                disabled={actionLoading}
              >
                Next question
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFeedback(null);
                  setHint(null);
                  fetchNextQuestion();
                }}
                disabled={actionLoading}
              >
                Next question
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
