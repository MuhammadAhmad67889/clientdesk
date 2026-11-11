// Shown instantly while a page loads, so a slow first request
// (a cold server, or the database waking up) never looks like a
// dead white screen. Next.js wraps every page in this automatically.
export default function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading">
      <span className="loading-spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}
