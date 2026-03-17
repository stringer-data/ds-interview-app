import Link from "next/link";

const TOPICS = [
  "A/B testing & experimentation",
  "Causal inference",
  "Statistics",
  "Machine learning",
  "Product sense",
];

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          DS Interview Trainer
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1.5 }}>
          Get interview-ready in about 30 minutes a day. Practice that adapts to your level and focuses on what you miss.
        </p>
      </header>

      <section className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)", lineHeight: 1.7 }}>
          <li>Answer questions matched to your level — no cookie-cutter drills</li>
          <li>Get instant feedback so you know what’s strong and what to fix</li>
          <li>Spaced repetition on weak spots so it actually sticks</li>
        </ol>
      </section>

      <section className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>What you’ll practice</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)", lineHeight: 1.8 }}>
          {TOPICS.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
        <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
          No fluff — just practice that builds real intuition.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <Link href="/signup" className="btn btn-primary">
          Start free — no credit card
        </Link>
        <span style={{ marginLeft: "1rem" }}>
          Already have an account? <Link href="/login">Log in</Link>
        </span>
      </section>
    </div>
  );
}
