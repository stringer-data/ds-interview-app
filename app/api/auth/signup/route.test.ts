import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { POST } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    invite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve("hashed")),
  },
}));

import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);
const mockInviteFindUnique = vi.mocked(prisma.invite.findUnique);
const mockInviteUpdate = vi.mocked(prisma.invite.update);

function jsonRequest(body: object) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: "new@example.com",
  password: "password123",
  first_name: "First",
  last_name: "Last",
  newsletter_opt_in: true,
};

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "user-1",
      email: validBody.email,
      tier: "free",
    } as never);
    mockInviteFindUnique.mockResolvedValue(null);
  });

  describe("validation (Zod) – 400 and structured error", () => {
    it("returns 400 with fieldErrors for invalid email", async () => {
      const res = await POST(jsonRequest({ email: "not-an-email", password: "longenough" }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toHaveProperty("fieldErrors");
      expect(data.error).toHaveProperty("formErrors");
      expect(data.error.fieldErrors).toHaveProperty("email");
      expect(Array.isArray(data.error.fieldErrors.email)).toBe(true);
      expect(data.error.fieldErrors.email[0]).toBeDefined();
      expect(typeof data.error.fieldErrors.email[0]).toBe("string");
    });

    it("returns 400 with fieldErrors for password too short", async () => {
      const res = await POST(jsonRequest({ email: "a@b.co", password: "short" }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.fieldErrors).toHaveProperty("password");
      expect(data.error.fieldErrors.password[0]).toBeDefined();
    });

    it("returns 400 for missing email", async () => {
      const res = await POST(jsonRequest({ password: "longenough" }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toHaveProperty("fieldErrors");
      const firstError = Object.values(data.error.fieldErrors).flat().find(Boolean);
      expect(firstError).toBeDefined();
    });

    it("returns 400 for missing password", async () => {
      const res = await POST(jsonRequest({ email: "a@b.co" }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toHaveProperty("fieldErrors");
      const firstError = Object.values(data.error.fieldErrors).flat().find(Boolean);
      expect(firstError).toBeDefined();
    });
  });

  describe("duplicate email – 400 and clear message", () => {
    it("returns 400 'Email already registered' when findUnique returns a user", async () => {
      mockFindUnique.mockResolvedValue({ id: "existing", email: validBody.email } as never);
      const res = await POST(jsonRequest(validBody));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Email already registered");
    });

    it("returns 400 'Email already registered' when create throws P2002", async () => {
      mockFindUnique.mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      mockCreate.mockRejectedValue(p2002);
      const res = await POST(jsonRequest(validBody));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Email already registered");
    });
  });

  describe("database schema out of date – 500 and friendly message", () => {
    it("returns 500 with schema message when findUnique throws missing column error", async () => {
      mockFindUnique.mockRejectedValue(
        new Error("The column `User.first_name` does not exist in the current database.")
      );
      const res = await POST(jsonRequest(validBody));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Database schema is out of date. Run: npx prisma db push");
    });
  });

  describe("other server errors – 500 and generic message", () => {
    it("returns 500 'Signup failed. Please try again.' when create throws generic error", async () => {
      mockCreate.mockRejectedValue(new Error("Connection refused"));
      const res = await POST(jsonRequest(validBody));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Signup failed. Please try again.");
    });
  });

  describe("success – 200 and user payload", () => {
    it("returns 200 with id, email, tier on valid new signup", async () => {
      const res = await POST(jsonRequest(validBody));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id", "user-1");
      expect(data).toHaveProperty("email", validBody.email);
      expect(data).toHaveProperty("tier", "free");
      expect(data).not.toHaveProperty("error");
    });
  });
});
