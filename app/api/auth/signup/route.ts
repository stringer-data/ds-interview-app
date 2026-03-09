import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const bodySchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8),
  invite_code: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, invite_code } = bodySchema.parse(body);
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
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        tier,
        firstLoginAt: new Date(),
        lastLoginAt: new Date(),
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
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
