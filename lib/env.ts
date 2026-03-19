/**
 * Validates required production environment variables.
 * Call from instrumentation or at app startup so production fails fast if misconfigured.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  // NEXTAUTH_URL
  const url = process.env.NEXTAUTH_URL?.trim();
  if (!url) {
    throw new Error(
      "NEXTAUTH_URL must be set in production. Set it to your app URL (e.g. https://your-app.vercel.app)."
    );
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new Error(
        "NEXTAUTH_URL must use HTTPS in production. Current value: " + url
      );
    }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("Invalid URL")) {
      throw new Error(
        "NEXTAUTH_URL must be a valid URL in production. Current value: " + url
      );
    }
    throw err;
  }

  // NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET must be set in production. Generate one with `openssl rand -base64 32`."
    );
  }
  if (secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET should be a strong, long value (at least 32 characters)."
    );
  }

  // ADMIN_EMAILS
  const adminEmailsRaw = process.env.ADMIN_EMAILS?.trim() ?? "";
  if (!adminEmailsRaw) {
    throw new Error(
      "ADMIN_EMAILS must be set in production. Comma-separated list of emails that can access /admin (e.g. admin@example.com,you@example.com)."
    );
  }
  const adminEmails = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    throw new Error(
      "ADMIN_EMAILS must contain at least one email. Current value (after trimming): " +
        JSON.stringify(adminEmailsRaw)
    );
  }
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = adminEmails.filter((e) => !emailLike.test(e));
  if (invalid.length > 0) {
    throw new Error(
      "ADMIN_EMAILS must be valid email addresses. Invalid: " +
        invalid.join(", ")
    );
  }

  // DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set in production. Use your Postgres connection string (e.g. Neon, Supabase); add ?sslmode=require if SSL is required."
    );
  }
  try {
    const parsed = new URL(databaseUrl);
    const protocol = parsed.protocol.replace(/:$/, "");
    if (protocol !== "postgresql" && protocol !== "postgres") {
      throw new Error(
        "DATABASE_URL must be a Postgres URL (postgresql:// or postgres://). Got: " +
          protocol
      );
    }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("Invalid URL")) {
      throw new Error(
        "DATABASE_URL must be a valid URL in production. Check for typos or wrong variable."
      );
    }
    throw err;
  }

  // OPENAI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    throw new Error(
      "OPENAI_API_KEY must be set in production. Used for grading answers and the Help feature (starts with sk-...)."
    );
  }
  if (!openaiKey.startsWith("sk-")) {
    throw new Error(
      "OPENAI_API_KEY should start with sk- (OpenAI API key format). Check for typos or wrong variable."
    );
  }

  // PAYMENTS_ENABLED
  const paymentsEnabled = process.env.PAYMENTS_ENABLED?.trim().toLowerCase();
  if (paymentsEnabled !== "true" && paymentsEnabled !== "false") {
    throw new Error(
      "PAYMENTS_ENABLED must be set to 'true' or 'false' in production. Use 'false' for soft launch; use 'true' only when Stripe vars are configured (see checklist section 6)."
    );
  }
}
