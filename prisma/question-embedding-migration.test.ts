/**
 * Task 2 (RAG): Ensures QuestionEmbedding model exists in schema and a migration creates the table with vector column.
 * We test the artifacts so we don't require a live DB.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const prismaDir = join(process.cwd(), "prisma");
const schemaPath = join(prismaDir, "schema.prisma");
const migrationsDir = join(prismaDir, "migrations");

describe("QuestionEmbedding model and migration", () => {
  it("schema defines QuestionEmbedding model with questionId, embedding, modelVersion, updatedAt", () => {
    expect(existsSync(schemaPath)).toBe(true);
    const schema = readFileSync(schemaPath, "utf-8");
    expect(schema).toContain("model QuestionEmbedding");
    expect(schema).toMatch(/questionId\s+Int/);
    expect(schema).toContain("embedding");
    expect(schema).toMatch(/modelVersion\s+String/);
    expect(schema).toMatch(/updatedAt\s+DateTime/);
  });

  it("a migration creates question_embedding table with vector column", () => {
    expect(existsSync(migrationsDir)).toBe(true);
    const entries = readdirSync(migrationsDir, { withFileTypes: true });
    const migrationDirs = entries.filter((e) => e.isDirectory());
    const sqlContents: { name: string; content: string }[] = [];
    for (const dir of migrationDirs) {
      const sqlPath = join(migrationsDir, dir.name, "migration.sql");
      if (existsSync(sqlPath)) {
        sqlContents.push({ name: dir.name, content: readFileSync(sqlPath, "utf-8") });
      }
    }
    const createsQuestionEmbedding = sqlContents.find(
      (m) =>
        (m.content.includes("QuestionEmbedding") || m.content.toLowerCase().includes("question_embedding")) &&
        (m.content.includes("vector") || m.content.includes("embedding"))
    );
    expect(
      createsQuestionEmbedding,
      "at least one migration should create question_embedding table with vector/embedding column"
    ).toBeDefined();
  });
});
