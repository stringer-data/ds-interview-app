#!/usr/bin/env node
/**
 * Check if OPENAI_API_KEY in .env is valid by making a minimal API call.
 * Run from project root: node scripts/check-openai-key.mjs
 * Or: npm run check:openai
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const envPath = join(projectRoot, ".env");

if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ OPENAI_API_KEY is not set in .env");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const OpenAI = require("openai").default;

async function check() {
  const openai = new OpenAI({ apiKey });
  try {
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    });
    console.log("✅ OpenAI API key is valid.");
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("invalid_api_key")) {
      console.error("❌ Invalid API key. Get a new one at https://platform.openai.com/account/api-keys");
    } else if (msg.includes("429")) {
      console.error("❌ Rate limited or no credits. Check https://platform.openai.com/account/billing");
    } else {
      console.error("❌", msg);
    }
    process.exit(1);
  }
}

check();
