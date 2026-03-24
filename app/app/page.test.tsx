/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppPage from "./page";

const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace };
const mockSearchParams = { get: () => null as string | null };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

describe("App page feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the question and submitted answer in feedback after grading", async () => {
    const initialQuestion = {
      questionId: "q-1",
      followUpId: null,
      questionDisplayId: "Q1",
      topic: "Experimentation",
      theme: "Peeking",
      difficulty: 2,
      question: "Why is peeking at p-values problematic?",
    };

    const feedbackPayload = {
      score: 3,
      maxScore: 4,
      verdict: "Conceptually right, missing nuance",
      whatWasGood: "You identified inflated Type I error risk.",
      missingWrong: "Mention pre-registration and alpha spending.",
      exampleAnswers: "4. Strong answer here",
      followUpQuestion: "How can pre-registration help?",
      questionsUsed: 1,
      upsell: false,
      nextQuestion: initialQuestion,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/scorecard")) {
        return {
          ok: true,
          json: async () => ({
            tier: "free",
            questionsUsed: 0,
            questionsLeft: 10,
            totalPoints: 0,
            maxPoints: 0,
            overallPct: 0,
            todayPoints: 0,
            todayMax: 0,
            todayPct: 0,
            questionsAnsweredToday: 0,
            streak: 0,
            streakEndsOn: null,
            accuracyByTopic: {},
          }),
        } as Response;
      }

      if (url === "/api/next-question") {
        return {
          ok: true,
          text: async () => JSON.stringify(initialQuestion),
        } as Response;
      }

      if (url === "/api/submit-answer") {
        return {
          ok: true,
          text: async () => JSON.stringify(feedbackPayload),
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<AppPage />);

    await waitFor(() => {
      expect(screen.getByText(initialQuestion.question)).toBeInTheDocument();
    });

    const userAnswer = "Peeking increases false positives by repeated testing.";
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: userAnswer } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByText("Your submitted answer")).toBeInTheDocument();
    });
    expect(screen.getByText("Question")).toBeInTheDocument();
    expect(screen.getByText(initialQuestion.question)).toBeInTheDocument();
    expect(screen.getByText(userAnswer)).toBeInTheDocument();
  });

  it("renders example answers as a level list (not a monospace pre block)", async () => {
    const initialQuestion = {
      questionId: "q-1",
      followUpId: null,
      questionDisplayId: "Q1",
      topic: "Experimentation",
      theme: "Peeking",
      difficulty: 2,
      question: "Why is peeking at p-values problematic?",
    };

    const exampleAnswers = [
      "0. Off-topic reply.",
      "1. Weak reply.",
      "2. Partial reply.",
      "3. Good reply.",
      "4. Strong reply.",
    ].join("\n");

    const feedbackPayload = {
      score: 2,
      maxScore: 4,
      verdict: "OK",
      whatWasGood: "—",
      missingWrong: "—",
      exampleAnswers,
      followUpQuestion: "—",
      questionsUsed: 1,
      upsell: false,
      nextQuestion: initialQuestion,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/scorecard")) {
          return {
            ok: true,
            json: async () => ({
              tier: "free",
              questionsUsed: 0,
              questionsLeft: 10,
              totalPoints: 0,
              maxPoints: 0,
              overallPct: 0,
              todayPoints: 0,
              todayMax: 0,
              todayPct: 0,
              questionsAnsweredToday: 0,
              streak: 0,
              streakEndsOn: null,
              accuracyByTopic: {},
            }),
          } as Response;
        }
        if (url === "/api/next-question") {
          return { ok: true, text: async () => JSON.stringify(initialQuestion) } as Response;
        }
        if (url === "/api/submit-answer") {
          return { ok: true, text: async () => JSON.stringify(feedbackPayload) } as Response;
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      })
    );

    const { container } = render(<AppPage />);

    await waitFor(() => {
      expect(screen.getByText(initialQuestion.question)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(container.querySelector(".feedback-example-list")).toBeTruthy();
    });
    expect(screen.getByText("Strong reply.")).toBeInTheDocument();
    expect(container.querySelector("pre.feedback-block")).toBeNull();
  });
});
