import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestionById } from "@/lib/questions";

/**
 * GET /api/question?slug=xxx
 * Returns a single question by slug in the same shape as next-question,
 * so the practice page can load a specific question (e.g. from Insights recommendations).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const question = await getQuestionById(slug);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({
    questionId: question.id,
    followUpId: null,
    questionDisplayId: question.id,
    topic: question.topic,
    theme: question.theme,
    difficulty: question.difficulty,
    question: question.question,
    reference_answer: question.reference_answer,
  });
}
