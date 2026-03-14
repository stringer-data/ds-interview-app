import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gradeAnswer } from "@/lib/grader";
import { selectNextQuestion, getQuestionById, type AttemptRow } from "@/lib/questions";

const bodySchema = z.object({
  question_id: z.string(),
  follow_up_id: z.string().nullable().optional(),
  answer: z.string().min(1),
  /** For custom follow-up questions (question_id === "custom") */
  custom_question: z.string().min(1).optional(),
  custom_topic: z.string().max(100).optional(),
});

const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";
const FREE_CAP = parseInt(process.env.FREE_QUESTION_CAP ?? "10", 10) || 10;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const isCustom = body.question_id === "custom";
    if (isCustom && !body.custom_question?.trim()) {
      return NextResponse.json({ error: "custom_question required when question_id is custom" }, { status: 400 });
    }

    let questionText: string;
    let topic: string;
    let theme: string;
    let difficulty: number;

    if (isCustom) {
      questionText = body.custom_question!.trim();
      topic = body.custom_topic?.trim() || "Custom";
      theme = "Follow-up";
      difficulty = 1;
    } else {
      const displayId = body.follow_up_id ?? body.question_id;
      const question = await getQuestionById(displayId);
      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      questionText = question.question;
      topic = question.topic;
      theme = question.theme;
      difficulty = question.difficulty;
    }

    const reference = isCustom
      ? undefined
      : (await getQuestionById(body.follow_up_id ?? body.question_id))?.reference_answer;

    const grade = await gradeAnswer({
      question: questionText,
      answer: body.answer,
      referenceAnswer: reference,
    });
    const attemptData = {
      userId: user.id,
      questionId: isCustom ? "custom" : body.question_id,
      followUpId: isCustom ? null : (body.follow_up_id ?? null),
      topic,
      theme,
      difficulty,
      score: grade.score,
      maxScore: grade.maxScore,
      questionText,
      answer: body.answer.trim(),
    };
    const maxTries = 3;
    for (let tryCount = 1; tryCount <= maxTries; tryCount++) {
      try {
        await prisma.attempt.create({ data: attemptData });
        break;
      } catch (dbError) {
        const msg = dbError instanceof Error ? dbError.message : String(dbError);
        const isConnectionError = /closed|connection|ECONNRESET|ETIMEDOUT|connect/i.test(msg);
        if (isConnectionError && tryCount < maxTries) {
          await new Promise((r) => setTimeout(r, 300 * tryCount));
          continue;
        }
        if (isConnectionError) {
          return NextResponse.json(
            { error: "Database connection issue. Please try again." },
            { status: 503 }
          );
        }
        throw dbError;
      }
    }
    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id },
      select: { questionId: true, followUpId: true, score: true, loggedAt: true, topic: true },
      orderBy: { loggedAt: "asc" },
    });
    const questionsUsed = attempts.length;
    const isPaid = user.tier === "paid";
    const overCap = PAYMENTS_ENABLED && !isPaid && questionsUsed >= FREE_CAP;
    const rows: AttemptRow[] = attempts.map((a) => ({
      questionId: a.questionId,
      followUpId: a.followUpId,
      score: a.score,
      loggedAt: a.loggedAt,
      topic: a.topic,
    }));
    const next = overCap ? null : await selectNextQuestion(rows);
    return NextResponse.json({
      score: grade.score,
      maxScore: grade.maxScore,
      verdict: grade.verdict,
      whatWasGood: grade.whatWasGood,
      missingWrong: grade.missingWrong,
      exampleAnswers: grade.exampleAnswers,
      followUpQuestion: grade.followUpQuestion,
      questionsUsed,
      upsell: overCap,
      nextQuestion: next,
    });
  } catch (err) {
    console.error("submit-answer error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Something went wrong. Please try again.",
        ...(process.env.NODE_ENV !== "production" && { errorDetail: message }),
      },
      { status: 500 }
    );
  }
}
