import { describe, it, expect } from "vitest";
import { buildEmbeddingInputText } from "./embedding-input";

describe("buildEmbeddingInputText", () => {
  it("returns question only when referenceAnswer is null", () => {
    const out = buildEmbeddingInputText("What is design?", null);
    expect(typeof out).toBe("string");
    expect(out).toBe("What is design?");
    expect(out).not.toContain("undefined");
  });

  it("returns question and reference when both provided", () => {
    const out = buildEmbeddingInputText("What is design?", "Design is the process of...");
    expect(typeof out).toBe("string");
    expect(out).toContain("What is design?");
    expect(out).toContain("Design is the process of...");
    expect(out).not.toContain("undefined");
  });

  it("treats empty string reference as question only", () => {
    const out = buildEmbeddingInputText("What is design?", "");
    expect(typeof out).toBe("string");
    expect(out).toBe("What is design?");
    expect(out).not.toContain("undefined");
  });

  it("returns trimmed output with no leading/trailing whitespace", () => {
    const out = buildEmbeddingInputText("  What is design?  ", "  Some answer  ");
    expect(out).toBe(out.trim());
    expect(out).not.toContain("undefined");
  });
});
