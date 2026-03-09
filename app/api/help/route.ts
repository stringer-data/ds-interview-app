import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestionById } from "@/lib/questions";
import OpenAI from "openai";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("question_id");
  if (!questionId) {
    return NextResponse.json({ error: "question_id required" }, { status: 400 });
  }
  const question = getQuestionById(questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      hint: "Hint unavailable (no OPENAI_API_KEY). Try breaking the question into key concepts and answering each.",
    });
  }
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Give a short hint or outline to help someone answer this interview question. Do not give the full answer.\n\nQuestion: ${question.question}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });
  const hint = completion.choices[0]?.message?.content?.trim() ?? "No hint available.";
  return NextResponse.json({ hint });
}
