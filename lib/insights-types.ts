/**
 * Types for the user-facing Insights feature.
 * LLM returns strict JSON matching this schema.
 */

export type InsightStrength = {
  topic: string;
  reason: string;
  evidence: string;
};

export type InsightImprovementArea = {
  topic: string;
  issue: string;
  evidence: string;
  recommendation: string;
  /** Specific concepts/skills to work on within this topic (e.g. "confounders", "treatment effects") */
  focus_areas?: string[];
  /** Slugs of candidate questions that target this gap (user can click to practice) */
  recommended_question_slugs?: string[];
};

export type InsightPattern = {
  pattern: string;
  explanation: string;
};

export type InsightRecommendedQuestion = {
  question_id: string;
  question_text: string;
  why_recommended: string;
  topic: string;
  level: number;
};

export type InsightsLLMResponse = {
  summary: string;
  strengths: InsightStrength[];
  improvement_areas: InsightImprovementArea[];
  patterns: InsightPattern[];
  next_steps: string[];
  recommended_questions: InsightRecommendedQuestion[];
};

/** Question details keyed by slug for per-card links */
export type QuestionDetailsMap = Record<string, { question: string; topic: string; level: number }>;

/** Payload returned by GET /api/insights when we have enough data */
export type InsightsPayload = {
  hasEnoughData: true;
  attemptCount: number;
  insights: InsightsLLMResponse;
  /** Slug -> { question, topic, level } for rendering per-improvement-area question links */
  questionDetails?: QuestionDetailsMap;
};

/** Payload when user has too few attempts */
export type InsightsEmptyPayload = {
  hasEnoughData: false;
  attemptCount: number;
  minAttempts: number;
};

export type InsightsAPIResponse = InsightsPayload | InsightsEmptyPayload;

/** One attempt record for building history summary (from DB) */
export type AttemptForInsights = {
  questionId: string;
  followUpId: string | null;
  topic: string;
  theme: string;
  difficulty: number;
  score: number;
  maxScore: number;
  questionText: string | null;
  answer: string | null;
  loggedAt: Date;
};

/** Candidate question from RAG for the LLM to recommend from */
export type RAGCandidateQuestion = {
  slug: string;
  question: string;
  topic: string;
  level: number;
};
