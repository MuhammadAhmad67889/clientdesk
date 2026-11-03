"use client";

import { useEffect, useState } from "react";

/** Google and GitHub buttons, shown only for providers the server
 * says are configured. Renders nothing when neither is set up. */
export default function OAuthButtons() {
  const [providers, setProviders] = useState<{ github: boolean; google: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch(() => undefined);
  }, []);

  if (!providers || (!providers.google && !providers.github)) return null;
  return (
    <div>
      <div className="actions full" style={{ display: "grid", gap: 8 }}>
        {providers.google && (
          <a className="btn" href="/api/auth/oauth/google/start" style={{ textAlign: "center" }}>
            Continue with Google
          </a>
        )}
        {providers.github && (
          <a className="btn" href="/api/auth/oauth/github/start" style={{ textAlign: "center" }}>
            Continue with GitHub
          </a>
        )}
      </div>
      <p className="hint" style={{ textAlign: "center" }}>or continue with email</p>
    </div>
  );
}
