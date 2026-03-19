import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateProductionEnv } from "./env";

const originalEnv = process.env;

describe("validateProductionEnv", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXTAUTH_URL = "https://app.example.com";
    process.env.NEXTAUTH_SECRET = "a-very-long-secret-value-that-is-secure";
    process.env.ADMIN_EMAILS = "admin@example.com,you@example.com";
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.OPENAI_API_KEY = "sk-proj-abc123";
    process.env.PAYMENTS_ENABLED = "false";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it("does not throw when NODE_ENV is production and NEXTAUTH_URL is a valid HTTPS URL", () => {
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("throws when NODE_ENV is production and NEXTAUTH_URL is missing", () => {
    delete process.env.NEXTAUTH_URL;
    expect(() => validateProductionEnv()).toThrow(/NEXTAUTH_URL/);
  });

  it("throws when NODE_ENV is production and NEXTAUTH_URL is empty", () => {
    process.env.NEXTAUTH_URL = "";
    expect(() => validateProductionEnv()).toThrow(/NEXTAUTH_URL/);
  });

  it("throws when NODE_ENV is production and NEXTAUTH_URL is http (not HTTPS)", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(() => validateProductionEnv()).toThrow(/NEXTAUTH_URL.*https/i);
  });

  it("throws when NODE_ENV is production and NEXTAUTH_URL is not a valid URL", () => {
    process.env.NEXTAUTH_URL = "not-a-url";
    expect(() => validateProductionEnv()).toThrow(/NEXTAUTH_URL/);
  });

  it("throws when NODE_ENV is production and NEXTAUTH_SECRET is missing", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => validateProductionEnv()).toThrow(/NEXTAUTH_SECRET/);
  });

  it("throws when NODE_ENV is production and NEXTAUTH_SECRET is too short", () => {
    process.env.NEXTAUTH_SECRET = "short-secret";
    expect(() => validateProductionEnv()).toThrow(/NEXTAUTH_SECRET/);
  });

  it("does not throw when NODE_ENV is development even if NEXTAUTH_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXTAUTH_SECRET;
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("does not throw when NODE_ENV is production and ADMIN_EMAILS has one valid email", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("does not throw when NODE_ENV is production and ADMIN_EMAILS has multiple valid emails", () => {
    process.env.ADMIN_EMAILS = "admin@example.com, you@example.com ";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("throws when NODE_ENV is production and ADMIN_EMAILS is missing", () => {
    delete process.env.ADMIN_EMAILS;
    expect(() => validateProductionEnv()).toThrow(/ADMIN_EMAILS/);
  });

  it("throws when NODE_ENV is production and ADMIN_EMAILS is empty", () => {
    process.env.ADMIN_EMAILS = "";
    expect(() => validateProductionEnv()).toThrow(/ADMIN_EMAILS/);
  });

  it("throws when NODE_ENV is production and ADMIN_EMAILS has no valid email after trim", () => {
    process.env.ADMIN_EMAILS = "  , , ";
    expect(() => validateProductionEnv()).toThrow(/ADMIN_EMAILS/);
  });

  it("throws when NODE_ENV is production and ADMIN_EMAILS contains invalid email", () => {
    process.env.ADMIN_EMAILS = "admin@example.com,not-an-email,you@example.com";
    expect(() => validateProductionEnv()).toThrow(/ADMIN_EMAILS.*Invalid|Invalid.*ADMIN_EMAILS/i);
    expect(() => validateProductionEnv()).toThrow(/not-an-email/);
  });

  it("does not throw when NODE_ENV is production and DATABASE_URL is postgresql://", () => {
    process.env.DATABASE_URL = "postgresql://u:p@h:5432/db?sslmode=require";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("does not throw when NODE_ENV is production and DATABASE_URL is postgres://", () => {
    process.env.DATABASE_URL = "postgres://u:p@h:5432/db";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("throws when NODE_ENV is production and DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => validateProductionEnv()).toThrow(/DATABASE_URL/);
  });

  it("throws when NODE_ENV is production and DATABASE_URL is empty", () => {
    process.env.DATABASE_URL = "";
    expect(() => validateProductionEnv()).toThrow(/DATABASE_URL/);
  });

  it("throws when NODE_ENV is production and DATABASE_URL is not a Postgres URL", () => {
    process.env.DATABASE_URL = "mysql://user:pass@host/db";
    expect(() => validateProductionEnv()).toThrow(/postgres|DATABASE_URL/i);
  });

  it("throws when NODE_ENV is production and DATABASE_URL is not a valid URL", () => {
    process.env.DATABASE_URL = "not-a-url";
    expect(() => validateProductionEnv()).toThrow(/DATABASE_URL/);
  });

  it("does not throw when NODE_ENV is production and OPENAI_API_KEY starts with sk-", () => {
    process.env.OPENAI_API_KEY = "sk-proj-xyz";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("throws when NODE_ENV is production and OPENAI_API_KEY is missing", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => validateProductionEnv()).toThrow(/OPENAI_API_KEY/);
  });

  it("throws when NODE_ENV is production and OPENAI_API_KEY is empty", () => {
    process.env.OPENAI_API_KEY = "";
    expect(() => validateProductionEnv()).toThrow(/OPENAI_API_KEY/);
  });

  it("throws when NODE_ENV is production and OPENAI_API_KEY does not start with sk-", () => {
    process.env.OPENAI_API_KEY = "invalid-key-format";
    expect(() => validateProductionEnv()).toThrow(/OPENAI_API_KEY|sk-/i);
  });

  it("does not throw when NODE_ENV is production and PAYMENTS_ENABLED is false", () => {
    process.env.PAYMENTS_ENABLED = "false";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("does not throw when NODE_ENV is production and PAYMENTS_ENABLED is true", () => {
    process.env.PAYMENTS_ENABLED = "true";
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("throws when NODE_ENV is production and PAYMENTS_ENABLED is missing", () => {
    delete process.env.PAYMENTS_ENABLED;
    expect(() => validateProductionEnv()).toThrow(/PAYMENTS_ENABLED/);
  });

  it("throws when NODE_ENV is production and PAYMENTS_ENABLED is not true or false", () => {
    process.env.PAYMENTS_ENABLED = "yes";
    expect(() => validateProductionEnv()).toThrow(/PAYMENTS_ENABLED/);
  });
});
