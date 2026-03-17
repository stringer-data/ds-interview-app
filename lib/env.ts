/**
 * Validates required production environment variables.
 * Call from instrumentation or at app startup so production fails fast if misconfigured.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

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
}
