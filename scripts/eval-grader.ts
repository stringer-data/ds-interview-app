import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { evaluateGrader, formatEvalReport, type EvalCase } from "@/lib/grader-eval";

async function main() {
  const argPath = process.argv[2];
  const fixturePath = argPath
    ? path.resolve(process.cwd(), argPath)
    : path.resolve(process.cwd(), "scripts/grader-eval-fixtures.json");

  const raw = await readFile(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as EvalCase[];
  const report = await evaluateGrader(parsed);
  const formatted = formatEvalReport(report);

  process.stdout.write(`${formatted}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to run grader eval: ${message}\n`);
  process.exitCode = 1;
});
