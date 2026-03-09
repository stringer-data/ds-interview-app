"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [upsell, setUpsell] = useState<{ questionsUsed: number; cap: number } | null>(null);

  const fetchScorecard = useCallback(async () => {
    const tz = typeof Intl !== "undefined" && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    const res = await fetch(`/api/scorecard?timezone=${encodeURIComponent(tz)}`);
    if (res.ok) {
      const data = await res.json();
      setScorecard(data);
    }
  }, []);

  const fetchNextQuestion = useCallback(async () => {
    const res = await fetch("/api/next-question");
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
  }, []);

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
    await fetchNextQuestion();
    setActionLoading(false);
  }

  async function handleHelp() {
    if (!question) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/help?question_id=${encodeURIComponent(question.questionDisplayId)}`);
      const data = await res.json();
      if (data.hint) alert(data.hint);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !answer.trim()) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.questionId,
          follow_up_id: question.followUpId,
          answer: answer.trim(),
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
      setFeedback(data as Feedback);
      await fetchScorecard();
      if (data.upsell && !data.nextQuestion) {
        setUpsell({ questionsUsed: data.questionsUsed, cap: 10 });
        setQuestion(null);
      } else if (data.nextQuestion) {
        setQuestion(data.nextQuestion);
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

      {!question && !feedback && !upsell && (
        <p style={{ color: "var(--muted)" }}>No questions available. Check QUESTIONS_PATH.</p>
      )}

      {question && !feedback && (
        <div className="card">
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
              <h4 className="feedback-label">Follow-up question</h4>
              <p className="feedback-text">{feedback.followUpQuestion}</p>
            </section>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {feedback.nextQuestion ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setQuestion(feedback!.nextQuestion!);
                  setAnswer("");
                  setFeedback(null);
                }}
                disabled={actionLoading}
              >
                Next question
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setFeedback(null);
                  fetchNextQuestion();
                }}
                disabled={actionLoading}
              >
                Get next question
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
