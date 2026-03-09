import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/app");

  return (
    <div className="container" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <Link href="/app" style={{ fontWeight: 600, color: "var(--text)" }}>
          DS Trainer
        </Link>
        <nav style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link href="/app/scorecard" style={{ fontSize: "0.9rem" }}>
            Scorecard
          </Link>
          <Link href="/app/account" style={{ fontSize: "0.9rem" }}>
            Account
          </Link>
          <ThemeToggle />
          <SignOutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
