#!/usr/bin/env node
/**
 * One-off script: import YAML question bank into the new Prisma Question schema.
 *
 * - Reads all .yaml files from QUESTIONS_PATH (or a default path).
 * - Upserts Topic and Theme rows.
 * - Upserts Question rows keyed by slug == YAML id.
 *
 * Usage (from repo root):
 *   QUESTIONS_PATH=../ds-interview-trainer-v1/data/questions node scripts/import-questions-from-yaml.mjs
 */

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_QUESTIONS_PATH = path.join(
  process.cwd(),
  "..",
  "ds-interview-trainer-v1",
  "data",
  "questions",
);

const QUESTIONS_PATH =
  process.env.QUESTIONS_PATH && process.env.QUESTIONS_PATH.trim() !== ""
    ? (path.isAbsolute(process.env.QUESTIONS_PATH)
        ? process.env.QUESTIONS_PATH
        : path.resolve(process.cwd(), process.env.QUESTIONS_PATH))
    : DEFAULT_QUESTIONS_PATH;

function toSlug(name) {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function difficultyStepFromNumber(n) {
  const num = Number(n) || 1;
  switch (num) {
    case 1:
      return "STEP1_DEFINITION";
    case 2:
      return "STEP2_INTUITION";
    case 3:
      return "STEP3_APPLIED_PRODUCT";
    case 4:
      return "STEP4_TECHNICAL_ASSUMPTIONS";
    case 5:
    default:
      return "STEP5_HARD_CASE";
  }
}

function dimensionFromString(dim) {
  if (!dim) return null;
  const d = String(dim).toLowerCase();
  if (d === "strategy") return "STRATEGY";
  if (d === "interpretation") return "INTERPRETATION";
  if (d === "math") return "MATH";
  return null;
}

async function main() {
  console.log("Using QUESTIONS_PATH:", QUESTIONS_PATH);
  if (!fs.existsSync(QUESTIONS_PATH)) {
    console.error("Directory does not exist:", QUESTIONS_PATH);
    process.exit(1);
  }

  const files = fs
    .readdirSync(QUESTIONS_PATH)
    .filter((f) => f.endsWith(".yaml") && !f.startsWith("."))
    .sort();

  console.log(`Found ${files.length} YAML files.`);

  let createdQuestions = 0;
  let updatedQuestions = 0;

  for (const file of files) {
    const filePath = path.join(QUESTIONS_PATH, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const list = YAML.parse(content);
    if (!Array.isArray(list)) {
      console.warn(`Skipping ${file} (not a list).`);
      continue;
    }

    console.log(`Processing ${file} (${list.length} entries)...`);

    for (const q of list) {
      if (!q?.id || q.topic == null || q.theme == null || q.difficulty == null) {
        continue;
      }

      const topicName = String(q.topic).trim() || "Other";
      const themeName = String(q.theme).trim() || "General";

      const topicSlug = toSlug(topicName);
      const themeSlug = toSlug(themeName);

      const topic = await prisma.topic.upsert({
        where: { slug: topicSlug },
        update: { name: topicName },
        create: { name: topicName, slug: topicSlug },
      });

      const theme = await prisma.theme.upsert({
        where: { slug: themeSlug },
        update: { name: themeName },
        create: { name: themeName, slug: themeSlug },
      });

      const difficultyLevel = Number(q.difficulty) || 1;
      const difficultyStep = difficultyStepFromNumber(difficultyLevel);
      const dimension = dimensionFromString(q.dimension);

      const slug = String(q.id);

      const tags = Array.isArray(q.tags)
        ? q.tags.map((t) => String(t)).filter(Boolean)
        : [];

      const existing = await prisma.question.findUnique({ where: { slug } });

      if (!existing) {
        await prisma.question.create({
          data: {
            slug,
            topicId: topic.id,
            themeId: theme.id,
            difficultyLevel,
            difficultyStep,
            dimension,
            question: q.question ?? "",
            referenceAnswer: q.reference_answer ?? null,
            category: q.category ?? null,
            tags,
            active: true,
          },
        });
        createdQuestions++;
      } else {
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            topicId: topic.id,
            themeId: theme.id,
            difficultyLevel,
            difficultyStep,
            dimension,
            question: q.question ?? existing.question,
            referenceAnswer: q.reference_answer ?? existing.referenceAnswer,
            category: q.category ?? existing.category,
            tags: tags.length ? tags : existing.tags,
          },
        });
        updatedQuestions++;
      }
    }
  }

  console.log(`Import complete. Created ${createdQuestions} questions, updated ${updatedQuestions}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

