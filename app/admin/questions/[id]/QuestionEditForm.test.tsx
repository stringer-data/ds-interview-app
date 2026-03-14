/**
 * @vitest-environment jsdom
 *
 * Tests that the detail/edit area is a single section: view mode shows read-only
 * details; Edit shows the form in the same place; Cancel returns to read-only.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionEditForm } from "./QuestionEditForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const defaultProps = {
  questionId: 4,
  initialQuestion: "What is the question?",
  initialReferenceAnswer: "The answer.",
  initialDifficultyLevel: 3,
  initialActive: true,
  initialCategory: "Causal Inference",
  initialTags: ["tag1", "tag2"],
  topicName: "Case Studies",
  themeName: "Design",
  initialTopicId: 1,
  initialThemeId: 1,
  topics: [{ id: 1, name: "Case Studies", slug: "case-studies" }],
  themes: [{ id: 1, name: "Design", slug: "design" }],
};

describe("QuestionEditForm – view / edit layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("in view mode, shows question text, answer, category, tags, and difficulty label in the details section", () => {
    render(<QuestionEditForm {...defaultProps} />);
    expect(screen.getByText("What is the question?")).toBeInTheDocument();
    expect(screen.getByText("The answer.")).toBeInTheDocument();
    expect(screen.getByText(/Causal Inference/)).toBeInTheDocument();
    expect(screen.getByText(/tag1, tag2/)).toBeInTheDocument();
    expect(screen.getByText(/Applied product/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit question/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  it("clicking Edit hides read-only details and shows the form in the same area", () => {
    render(<QuestionEditForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit question/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/question text/i)).toHaveValue("What is the question?");
  });

  it("clicking Cancel returns to read-only details view", () => {
    render(<QuestionEditForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /edit question/i })).toBeInTheDocument();
    expect(screen.getByText("What is the question?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
  });

  it("edit mode shows category as dropdown with enum-backed options", () => {
    render(<QuestionEditForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    const categorySelect = screen.getByLabelText(/category/i);
    expect(categorySelect).toBeInTheDocument();
    expect(categorySelect.tagName).toBe("SELECT");
    expect(categorySelect).toHaveValue("Causal Inference");
    expect(screen.getByRole("option", { name: "Gen AI" })).toBeInTheDocument();
  });

  it("edit mode shows difficulty as dropdown with text labels and saves underlying value", () => {
    render(<QuestionEditForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    const difficultySelect = screen.getByLabelText(/difficulty/i);
    expect(difficultySelect).toBeInTheDocument();
    expect(difficultySelect.tagName).toBe("SELECT");
    expect(difficultySelect).toHaveValue("3");
    expect(screen.getByRole("option", { name: "Applied product" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Definition" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hard case" })).toBeInTheDocument();
  });

  it("saving persists category, difficulty, and tags (tags normalized by API)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);
    render(<QuestionEditForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/questions/4"),
        expect.objectContaining({
          method: "PATCH",
          body: expect.any(String),
        })
      );
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.category).toBe("Causal Inference");
    expect(body.difficulty_level).toBe(3);
    expect(body.tags).toEqual(["tag1", "tag2"]);
    expect(body.topic_id).toBe(1);
    expect(body.theme_id).toBe(1);
    vi.unstubAllGlobals();
  });

  it("edit mode shows Topic and Theme dropdowns when topics and themes are provided", () => {
    render(<QuestionEditForm {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    expect(screen.getByLabelText(/^topic$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^theme$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^topic$/i)).toHaveValue("1");
    expect(screen.getByLabelText(/^theme$/i)).toHaveValue("1");
  });
});
