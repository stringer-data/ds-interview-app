import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  invitee_name: z.string().max(200).optional().transform((s) => s?.trim() || null),
  tier_to_grant: z.enum(["free", "paid"]),
});

export async function POST(req: Request) {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const inviteCode = randomBytes(12).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  await prisma.invite.create({
    data: {
      createdBy: result.user.id,
      email: body.email && body.email.length > 0 ? body.email.trim().toLowerCase() : null,
      inviteeName: body.invitee_name || null,
      inviteCode,
      tierToGrant: body.tier_to_grant,
    },
  });
  const inviteLink = `${baseUrl}/signup?invite=${inviteCode}`;
  return NextResponse.json({ invite_code: inviteCode, invite_link: inviteLink });
}
