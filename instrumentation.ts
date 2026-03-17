/**
 * Runs once when the Next.js server starts. Used to validate production env (e.g. NEXTAUTH_URL).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv } = await import("./lib/env");
    validateProductionEnv();
  }
}
