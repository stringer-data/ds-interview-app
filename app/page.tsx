import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          DS Interview Trainer
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Interview-ready in 30 minutes a day. DS interview drill that adapts to you.
        </p>
      </header>

      <section className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--muted)" }}>
          <li>Get a question matched to your level</li>
          <li>Answer and get instant feedback</li>
          <li>Questions adapt to your weak spots</li>
        </ol>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
          Spaced repetition on what you miss. A/B testing, causal inference, stats, ML, product sense — no fluff, just practice.
        </p>
        <Link href="/signup" className="btn btn-primary">
          Start free
        </Link>
        <span style={{ marginLeft: "1rem" }}>
          Already have an account? <Link href="/login">Log in</Link>
        </span>
      </section>
    </div>
  );
}
