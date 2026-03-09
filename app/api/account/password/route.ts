import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!fullUser?.passwordHash) {
    return NextResponse.json({ error: "Password change not available for this account" }, { status: 400 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors.map((err) => err.message).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const valid = await bcrypt.compare(body.currentPassword, fullUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return NextResponse.json({ success: true });
}
