/**
 * Task 1 (RAG): Ensures the pgvector extension migration exists and contains the required SQL.
 * We test the artifact (migration file) so that enabling pgvector is verified without a live DB.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const migrationsDir = join(process.cwd(), "prisma", "migrations");

describe("pgvector migration", () => {
  it("has a migration that enables the vector extension", () => {
    expect(existsSync(migrationsDir), "prisma/migrations directory should exist").toBe(true);
    const entries = readdirSync(migrationsDir, { withFileTypes: true });
    const migrationDirs = entries.filter((e) => e.isDirectory());
    const sqlContents: string[] = [];
    for (const dir of migrationDirs) {
      const sqlPath = join(migrationsDir, dir.name, "migration.sql");
      if (existsSync(sqlPath)) {
        sqlContents.push(readFileSync(sqlPath, "utf-8"));
      }
    }
    const hasPgvector = sqlContents.some((content) =>
      content.includes("CREATE EXTENSION IF NOT EXISTS vector")
    );
    expect(hasPgvector, "at least one migration should contain CREATE EXTENSION IF NOT EXISTS vector").toBe(true);
  });
});
