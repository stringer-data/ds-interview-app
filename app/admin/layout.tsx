import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requireAdmin();
  if ("error" in result) {
    if (result.status === 401) redirect("/login?callbackUrl=/admin");
    return <div className="container" style={{ padding: "2rem" }}><p>Forbidden.</p></div>;
  }

  return (
    <div className="container" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem" }}>Admin</h1>
        <Link href="/app" className="btn btn-ghost">Back to app</Link>
      </header>
      {children}
    </div>
  );
}
