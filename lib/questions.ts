import { prisma } from "./db";

export type Dimension = "strategy" | "interpretation" | "math";

export type QuestionMeta = {
  id: string;
  topic: string;
  theme: string;
  difficulty: number;
  /** Strategy, interpretation, or math – so each topic can mix all three. */
  dimension?: Dimension;
  follow_ups?: string[];
};

export type Question = QuestionMeta & {
  question: string;
  reference_answer?: string;
  category?: string;
  tags?: string[];
};

let cachedBank: QuestionMeta[] | null = null;
let cachedFullById: Map<string, Question> | null = null;
let cachedParentByFollowUp: Map<string, string> | null = null;

function dimensionFromEnum(dim: string | null): Dimension | undefined {
  if (!dim) return undefined;
  const d = dim.toLowerCase();
  if (d === "strategy") return "strategy";
  if (d === "interpretation") return "interpretation";
  if (d === "math") return "math";
  return undefined;
}

async function loadBankAndMaps(): Promise<{
  bank: QuestionMeta[];
  fullById: Map<string, Question>;
  parentByFollowUp: Map<string, string>;
}> {
  if (cachedBank && cachedFullById && cachedParentByFollowUp) {
    return { bank: cachedBank, fullById: cachedFullById, parentByFollowUp: cachedParentByFollowUp };
  }

  const rows = await prisma.question.findMany({
    where: { active: true },
    include: {
      topic: true,
      theme: true,
    },
  });

  const bank: QuestionMeta[] = [];
  const fullById = new Map<string, Question>();
  const parentByFollowUp = new Map<string, string>();

  for (const q of rows) {

    const meta: QuestionMeta = {
      id: q.slug,
      topic: q.topic.name,
      theme: q.theme.name,
      difficulty: q.difficultyLevel,
      dimension: dimensionFromEnum(q.dimension),
      follow_ups: undefined,
    };
    bank.push(meta);
    fullById.set(q.slug, {
      ...meta,
      question: q.question,
      reference_answer: q.referenceAnswer ?? undefined,
      category: q.category ?? undefined,
      tags: q.tags ?? undefined,
    });
  }

  cachedBank = bank;
  cachedFullById = fullById;
  cachedParentByFollowUp = parentByFollowUp;
  return { bank, fullById, parentByFollowUp };
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const { fullById } = await loadBankAndMaps();
  return fullById.get(id) ?? null;
}

export async function getQuestionBank(): Promise<QuestionMeta[]> {
  const { bank } = await loadBankAndMaps();
  return bank;
}

export type AttemptRow = {
  questionId: string;
  followUpId: string | null;
  score: number;
  loggedAt: Date;
  topic: string;
};

/** Effective id for an attempt: follow_up_id if present else question_id */
function effectiveId(a: AttemptRow): string {
  return a.followUpId ?? a.questionId;
}

/** Last attempt per effective question id */
function lastByEffectiveId(attempts: AttemptRow[]): Map<string, { score: number; questionId: string; followUpId: string | null; loggedAt: Date }> {
  const map = new Map<string, { score: number; questionId: string; followUpId: string | null; loggedAt: Date }>();
  for (const e of attempts) {
    const eid = effectiveId(e);
    const prev = map.get(eid);
    if (!prev || e.loggedAt >= prev.loggedAt) {
      map.set(eid, { score: e.score, questionId: e.questionId, followUpId: e.followUpId, loggedAt: e.loggedAt });
    }
  }
  return map;
}

/** Compute weakest two topics by accuracy from attempts */
function weakestTwoTopics(attempts: AttemptRow[]): string[] {
  const byTopic: Record<string, { score: number; max: number }> = {};
  for (const e of attempts) {
    const t = e.topic ?? "Other";
    if (!byTopic[t]) byTopic[t] = { score: 0, max: 0 };
    byTopic[t].score += e.score;
    byTopic[t].max += 4;
  }
  const accuracy: Record<string, number> = {};
  for (const [t, d] of Object.entries(byTopic)) {
    accuracy[t] = d.max ? d.score / d.max : 0;
  }
  const sorted = Object.keys(accuracy).sort((a, b) => accuracy[a] - accuracy[b]);
  return sorted.slice(0, 2);
}

export type NextQuestionResult = {
  questionId: string;
  followUpId: string | null;
  questionDisplayId: string;
  topic: string;
  theme: string;
  difficulty: number;
  question: string;
  reference_answer?: string;
};

export { ALL_TOPICS, topicToSlug, topicFromSlug } from "./topics";

export type SelectNextQuestionOptions = {
  /** When set, exclude questions from this topic (e.g. to force a new random topic). */
  excludeTopic?: string;
  /** When set, only choose questions from this topic (display name). */
  topic?: string;
};

export async function selectNextQuestion(
  attempts: AttemptRow[],
  options: SelectNextQuestionOptions = {}
): Promise<NextQuestionResult | null> {
  const { bank, fullById, parentByFollowUp } = await loadBankAndMaps();
  if (bank.length === 0) return null;

  const { excludeTopic, topic: topicFilter } = options;
  let bankFiltered = bank;
  if (topicFilter != null && topicFilter !== "") {
    bankFiltered = bankFiltered.filter((q) => q.topic === topicFilter);
  }
  if (excludeTopic != null && excludeTopic !== "") {
    bankFiltered = bankFiltered.filter((q) => q.topic !== excludeTopic);
  }
  if (bankFiltered.length === 0) return null;

  const lastById = lastByEffectiveId(attempts);
  const neverAsked = bankFiltered.filter((q) => !lastById.has(q.id));
  const retryPool = bankFiltered.filter((q) => {
    const last = lastById.get(q.id);
    return last && last.score >= 0 && last.score <= 2;
  });
  const weakest = weakestTwoTopics(attempts);

  const pickFromNeverAsked = (): QuestionMeta | null => {
    if (neverAsked.length === 0) return null;
    if (weakest.length > 0) {
      const weak = neverAsked.filter((q) => weakest.includes(q.topic));
      if (weak.length > 0) return weak[Math.floor(Math.random() * weak.length)];
    }
    return neverAsked[Math.floor(Math.random() * neverAsked.length)] ?? null;
  };
  const pickFromRetry = (): QuestionMeta | null => {
    if (retryPool.length === 0) return null;
    return retryPool[Math.floor(Math.random() * retryPool.length)] ?? null;
  };

  let chosen: QuestionMeta | null = null;
  const useRetry = retryPool.length > 0 && neverAsked.length === 0;
  if (useRetry) {
    chosen = pickFromRetry();
  } else {
    chosen = pickFromNeverAsked();
  }
  if (!chosen) chosen = pickFromNeverAsked() ?? pickFromRetry();
  if (!chosen) chosen = bankFiltered[Math.floor(Math.random() * bankFiltered.length)];

  const parentId = parentByFollowUp.get(chosen.id);
  const questionId = parentId ?? chosen.id;
  const followUpId = parentId ? chosen.id : null;
  const displayId = chosen.id;
  const full = fullById.get(displayId);
  if (!full) return null;

  return {
    questionId,
    followUpId,
    questionDisplayId: displayId,
    topic: chosen.topic,
    theme: chosen.theme,
    difficulty: chosen.difficulty,
    question: full.question,
    reference_answer: full.reference_answer,
  };
}

/** Invalidate cache (e.g. after QUESTIONS_PATH change); useful for dev */
export function invalidateQuestionCache(): void {
  cachedBank = null;
  cachedFullById = null;
  cachedParentByFollowUp = null;
}
