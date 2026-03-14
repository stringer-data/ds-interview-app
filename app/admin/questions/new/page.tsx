import Link from "next/link";
import { prisma } from "@/lib/db";
import { ALL_TOPICS, topicToSlug } from "@/lib/topics";
import { CreateQuestionForm } from "./CreateQuestionForm";

const ALLOWED_SLUGS = ALL_TOPICS.map((t) => topicToSlug(t));

export default async function AdminNewQuestionPage() {
  const [topics, themes] = await Promise.all([
    prisma.topic.findMany({
      where: { slug: { in: ALLOWED_SLUGS } },
      orderBy: { name: "asc" },
    }),
    prisma.theme.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Create question</h2>
        <Link href="/admin/questions" className="btn btn-ghost">
          Back to questions
        </Link>
      </div>
      {topics.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No topics found. Add topics to the database first.</p>
      ) : themes.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No themes found. Add themes to the database first.</p>
      ) : (
        <CreateQuestionForm
          topics={topics.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
          themes={themes.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
        />
      )}
    </section>
  );
}
