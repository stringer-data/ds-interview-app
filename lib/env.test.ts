import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateProductionEnv } from "./env";

const originalEnv = process.env;

describe("validateProductionEnv", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXTAUTH_URL = "https://app.example.com";
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

  it("does not throw when NODE_ENV is development even if NEXTAUTH_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXTAUTH_URL;
    expect(() => validateProductionEnv()).not.toThrow();
  });
});
