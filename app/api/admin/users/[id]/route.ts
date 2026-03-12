import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  tier: z.enum(["free", "paid"]).optional(),
  first_name: z.string().max(100).optional().transform((s) => s?.trim() || null),
  last_name: z.string().max(100).optional().transform((s) => s?.trim() || null),
});

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
  const data: { tier?: string; firstName?: string | null; lastName?: string | null } = {};
  if (body.tier !== undefined) data.tier = body.tier;
  if (body.first_name !== undefined) data.firstName = body.first_name;
  if (body.last_name !== undefined) data.lastName = body.last_name;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id },
    data,
  });
  return NextResponse.json(user);
}

const deleteBodySchema = z.object({
  confirm: z.literal("DELETE"),
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { id } = await params;
  let body: z.infer<typeof deleteBodySchema>;
  try {
    body = deleteBodySchema.parse(await _req.json());
  } catch {
    return NextResponse.json(
      { error: "Body must be { confirm: \"DELETE\" } to confirm deletion." },
      { status: 400 }
    );
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Record to delete does not exist|record not found/i.test(msg)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
