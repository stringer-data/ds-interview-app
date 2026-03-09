import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({ tier: z.enum(["free", "paid"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { id } = await params;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id },
    data: { tier: body.tier },
  });
  return NextResponse.json(user);
}
