import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, tier: true, firstLoginAt: true, lastLoginAt: true },
  });
  return user ?? null;
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  if (!isAdminEmail(user.email)) return { error: "Forbidden" as const, status: 403 };
  return { user };
}
