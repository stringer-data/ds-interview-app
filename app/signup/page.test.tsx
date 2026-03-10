/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SignupPage from "./page";

const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe("Signup page – error messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
  });

  describe("client-side validation", () => {
    it("shows 'Passwords don't match.' when password and confirm password differ", async () => {
      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different456" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(/Passwords don.t match\./)).toBeInTheDocument();
      });
    });
  });

  describe("API returns string error", () => {
    it("shows 'Email already registered' when API returns that error", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Email already registered" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(/Email already registered/)).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("shows schema message when API returns database schema error", async () => {
      const msg = "Database schema is out of date. Run: npx prisma db push";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: msg }),
        })
      );

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(new RegExp(msg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("shows 'Signup failed. Please try again.' when API returns that error", async () => {
      const msg = "Signup failed. Please try again.";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: msg }),
        })
      );

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });
  });

  describe("API returns Zod-flattened error (object)", () => {
    it("shows first field error when API returns fieldErrors", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: { fieldErrors: { email: ["Invalid email"] }, formErrors: [] },
            }),
        })
      );

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText("Invalid email")).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("shows first field error for password from fieldErrors", async () => {
      const msg = "String must contain at least 8 character(s)";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: { fieldErrors: { password: [msg] }, formErrors: [] },
            }),
        })
      );

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });

    it("shows form-level error when API returns only formErrors", async () => {
      const msg = "Something went wrong";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              error: { fieldErrors: {}, formErrors: [msg] },
            }),
        })
      );

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });
  });

  describe("API returns non-JSON or missing error", () => {
    it("shows fallback when res.json() returns empty object", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        })
      );

      render(<SignupPage />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText(/password \(min 8/i), { target: { value: "password123" } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(
          screen.getByText((content) =>
            content.includes("already registered") && content.includes("try logging in")
          )
        ).toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });
  });
});
