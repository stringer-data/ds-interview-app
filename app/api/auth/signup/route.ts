import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const bodySchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8),
  first_name: z.string().max(100).optional().transform((s) => s?.trim() || null),
  last_name: z.string().max(100).optional().transform((s) => s?.trim() || null),
  newsletter_opt_in: z.boolean().optional().default(false),
  invite_code: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, first_name, last_name, newsletter_opt_in, invite_code } = bodySchema.parse(body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    let tier: "free" | "paid" = "free";
    let inviteId: string | null = null;
    if (invite_code) {
      const invite = await prisma.invite.findUnique({
        where: { inviteCode: invite_code.trim(), usedAt: null },
      });
      if (invite) {
        tier = invite.tierToGrant as "free" | "paid";
        inviteId = invite.id;
      }
    }
    const signupSource = inviteId ? "invite" : "organic";
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: first_name || null,
        lastName: last_name || null,
        newsletterOptIn: newsletter_opt_in ?? false,
        signupSource,
        tier,
        firstLoginAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1,
      },
    });
    if (inviteId) {
      await prisma.invite.update({
        where: { id: inviteId },
        data: { usedAt: new Date() },
      });
    }
    return NextResponse.json({ id: user.id, email: user.email, tier: user.tier });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    // Prisma unique constraint (e.g. email already exists)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) console.error("[signup]", e);
    // Don't expose raw Prisma/internal errors to the client; use a short message
    const msg = e instanceof Error ? e.message : "";
    const friendly =
      msg.includes("does not exist in the current database") || msg.includes("Unknown column")
        ? "Database schema is out of date. Run: npx prisma db push"
        : "Signup failed. Please try again.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
