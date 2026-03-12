#!/usr/bin/env node
/**
 * Import causal_inference_interview_questions.csv from Downloads into causal.yaml.
 * CSV columns: Question, Answer
 */
import fs from "fs";
import path from "path";
import YAML from "yaml";

const CSV_PATH = path.join(process.env.HOME || "/Users/stringer", "Downloads", "causal_inference_interview_questions.csv");
const CAUSAL_PATH = path.join(process.cwd(), "data", "questions", "causal.yaml");

function parseCSV(content) {
  const lines = content.split(/\n/).filter((l) => l.trim());
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = [];
    let rest = line;
    while (rest.length > 0) {
      if (rest.startsWith('"')) {
        const end = rest.indexOf('"', 1);
        if (end === -1) {
          parts.push(rest.slice(1).replace(/""/g, '"'));
          break;
        }
        parts.push(rest.slice(1, end).replace(/""/g, '"'));
        rest = rest.slice(end + 1).replace(/^,/, "");
      } else {
        const idx = rest.indexOf(",");
        if (idx === -1) {
          parts.push(rest.trim());
          break;
        }
        parts.push(rest.slice(0, idx).trim());
        rest = rest.slice(idx + 1);
      }
    }
    if (parts.length >= 2) rows.push({ Question: parts[0].trim(), Answer: parts.slice(1).join(",").trim() });
    else if (parts.length === 1 && parts[0]) rows.push({ Question: parts[0].trim(), Answer: "" });
  }
  return rows;
}

function themeFromQuestion(text) {
  const t = text.toLowerCase();
  if (t.includes("did") || t.includes("difference-in-differences") || t.includes("did ")) return "DiD";
  if (t.includes("rdd") || t.includes("regression discontinuity") || t.includes("running variable") || t.includes("cutoff") || t.includes("bandwidth")) return "RDD";
  if (t.includes("instrumental") || t.includes("instrument") || t.includes("2sls") || t.includes("exclusion restriction") || t.includes("endogeneity")) return "Instrumental Variables";
  if (t.includes("synthetic control") || t.includes("donor pool") || t.includes("placebo test")) return "Synthetic Control";
  return "Quasi-experiments";
}

function difficultyFromQuestion(text) {
  const t = text.toLowerCase();
  if (t.startsWith("what is ") && t.length < 90 && !t.includes("how would")) return 1;
  if (t.startsWith("what are ") && t.length < 90) return 1;
  if (t.startsWith("in one sentence")) return 1;
  if (t.startsWith("what does ") && t.length < 100) return 1;
  if (t.startsWith("what would ") && t.length < 80) return 1;
  if (t.startsWith("why ") && t.length < 120) return 2;
  if (t.includes("write the regression") || t.includes("equation")) return 4;
  if (t.includes("how would you test") || t.includes("how test") || t.includes("how validate")) return 4;
  if (t.includes("what happens if") || t.includes("what if ") || t.includes("bias if")) return 4;
  if (t.includes("airbnb") || t.includes("uber") || t.includes("how would you") || t.includes("how measure") || t.includes("design ")) return 3;
  if (t.startsWith("what is ") || t.startsWith("what are ")) return 1;
  if (t.startsWith("why ")) return 2;
  return 3;
}

function slug(id) {
  return id.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();
}

const csvContent = fs.readFileSync(CSV_PATH, "utf8");
const rows = parseCSV(csvContent);
const header = rows[0];
if (header?.Question === "Question" && header?.Answer === "Answer") rows.shift();

const counts = { DiD: 0, RDD: 0, "Instrumental Variables": 0, "Synthetic Control": 0, "Quasi-experiments": 0 };
const newQuestions = rows.map((row, i) => {
  const theme = themeFromQuestion(row.Question);
  counts[theme]++;
  const prefix = theme === "DiD" ? "did" : theme === "RDD" ? "rdd" : theme === "Instrumental Variables" ? "iv" : theme === "Synthetic Control" ? "sc" : "quasi";
  const num = String(counts[theme]).padStart(2, "0");
  const id = `causal_${prefix}_${num}`;
  return {
    id,
    topic: "Causal",
    theme,
    difficulty: difficultyFromQuestion(row.Question),
    category: "Causal Inference",
    question: row.Question,
    reference_answer: row.Answer?.trim() || undefined,
    tags: [prefix, "causal"].filter(Boolean),
  };
});

const existing = YAML.parse(fs.readFileSync(CAUSAL_PATH, "utf8"));
const combined = Array.isArray(existing) ? [...existing, ...newQuestions] : newQuestions;
fs.writeFileSync(CAUSAL_PATH, YAML.stringify(combined), "utf8");
console.log(`Added ${newQuestions.length} questions to causal.yaml`);
console.log("By theme:", counts);
