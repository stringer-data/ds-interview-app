#!/usr/bin/env node
/**
 * Reassign difficulty (1-5) so that:
 * 1 = definition
 * 2 = intuition
 * 3 = applied product question
 * 4 = technical identification / assumptions
 * 5 = hard interview case
 */
import fs from "fs";
import path from "path";
import YAML from "yaml";

const DIR = path.join(process.cwd(), "data", "questions");

function normalize(qText) {
  if (!qText || typeof qText !== "string") return "";
  return qText.replace(/\s+/g, " ").trim();
}

function assignLevel(q) {
  const text = normalize(q.question);
  const id = (q.id || "").toLowerCase();
  const category = (q.category || "").toLowerCase();

  // Level 5: hard interview case — long, "we ran", "they say", "what could be the reason", case study
  if (
    text.length > 220 ||
    /we ran an? (a\/b )?test/i.test(text) ||
    /what could be the reason/i.test(text) ||
    /how would you respond/i.test(text) ||
    /they say|stakeholder says/i.test(text) ||
    id.includes("case") ||
    category.includes("case stud")
  ) {
    return 5;
  }

  // Level 4: technical / assumptions — when would you not, assumptions, tradeoffs, "how does that affect"
  if (
    /when would you not/i.test(text) ||
    /what (are|is) the assumption/i.test(text) ||
    /identify the assumption/i.test(text) ||
    /how does (that|the) affect/i.test(text) ||
    /how does .+ (change|increase)/i.test(text) ||
    /variance doubles|standard deviation doubles/i.test(text) ||
    /required sample size (change|increase)/i.test(text) ||
    /sample size scales/i.test(text) ||
    /multiple comparison|bonferroni|fdr/i.test(text) ||
    (id.includes("var_01") && (id.includes("variance_doubles") || id.includes("sd_doubles")))
  ) {
    return 4;
  }

  // Level 3: applied product — check before definition (How would you, Which, product names, design/measure)
  if (
    /How would you (design|measure|choose|modify|find|reduce|combat)/i.test(text) ||
    /Which (would you |metric )?choose/i.test(text) ||
    /Between the following/i.test(text) ||
    /What would be the best metric/i.test(text) ||
    /(Airbnb|Facebook|Uber|marketplace|Instagram)/i.test(text) ||
    /If you were running an experiment/i.test(text) ||
    /If you were running (an )?experiment/i.test(text) ||
    /name (2|3|two|three) .*metric/i.test(text) ||
    /(booking conversion|guardrail|primary metric)/i.test(text) ||
    /What metrics define success/i.test(text) ||
    /How (long|many) (will|would|do)/i.test(text) ||
    /(Roughly how many|how many users)/i.test(text) ||
    /(Baseline|experiment requires|Daily traffic).*(percent|users|group)/i.test(text) ||
    /For a ranking change|what unit of randomization/i.test(text) ||
    /Give a simple example in product/i.test(text) ||
    id.includes("sample_size") ||
    id.includes("duration") ||
    id.includes("metric_choice") ||
    id.includes("airbnb") ||
    id.includes("design_ab_01") ||
    id.includes("stratify") ||
    id.includes("guardrail") ||
    id.includes("stratified") ||
    id.includes("variance_reduction") ||
    id.includes("design_unit") ||
    id.includes("design_guardrails")
  ) {
    return 3;
  }

  // Level 2: intuition — Why, Explain, When is X preferred (before Level 1)
  if (
    /^Why (does|do|is|might|would)/i.test(text) ||
    /^Explain (the|why|how)/i.test(text) ||
    /Why (is|are) .+ (preferred|used|important)/i.test(text) ||
    /When (is|would) .+ preferred/i.test(text) ||
    /Why (is|does) .+ (matter|misleading)/i.test(text) ||
    (/^Why /i.test(text) && text.length < 180) ||
    (/^When would you (use|not)/i.test(text) && text.length < 120)
  ) {
    return 2;
  }

  // Level 1: definition — short "What is X?", "in one sentence", "What does X mean"
  if (
    / in one sentence\??$/i.test(text) ||
    /^What does .+ mean\??$/i.test(text) ||
    (/\bWhat (is|are) (a |an |the )?[\w\s]+\??\s*$/i.test(text) && text.length < 90) ||
    (/\bWhat (is|are) /i.test(text) && text.length < 85 && !/how would|why might|when would|give a/i.test(text)) ||
    (/^What (is|are) /i.test(text) && !/and how|and when|and why|\. Give|, give/i.test(text) && text.length < 100)
  ) {
    return 1;
  }

  // Default
  if (/What is|What are/i.test(text)) return 1;
  if (/Why|Explain/i.test(text)) return 2;
  return 3;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".yaml") && !f.startsWith(".")).sort();
const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

for (const file of files) {
  const filePath = path.join(DIR, file);
  const content = fs.readFileSync(filePath, "utf8");
  const list = YAML.parse(content);
  if (!Array.isArray(list)) continue;
  for (const q of list) {
    const level = assignLevel(q);
    q.difficulty = level;
    counts[level]++;
  }
  fs.writeFileSync(filePath, YAML.stringify(list), "utf8");
  console.log(`Updated ${file}`);
}

console.log("\nLevel counts:", counts);
console.log("  Level 1 = definition, 2 = intuition, 3 = applied product, 4 = technical/assumptions, 5 = hard case");
