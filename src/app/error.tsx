"use client";

/** Shown when a page crashes in production. Next.js hides the real
 * error from the visitor; this page says what happened in plain
 * words and offers a retry instead of a blank screen. */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "48px auto" }}>
      <h1>Something went wrong</h1>
      <p>That page hit an unexpected error. Nothing was charged or deleted — try loading it again.</p>
      <div className="page-actions">
        <button className="btn btn-primary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </div>
  );
}
