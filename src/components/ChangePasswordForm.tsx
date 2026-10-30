"use client";

import { useState } from "react";
import { validatePasswordChange } from "../lib/validation";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validatePasswordChange({ confirmPassword, currentPassword, newPassword });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (busy) return;
    setBusy(true);
    setDone(false);
    const res = await fetch("/api/auth/change-password", {
      body: JSON.stringify({ confirmPassword, currentPassword, newPassword }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setBusy(false);
    if (res.status === 401) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
      if (data?.errors?.form) {
        window.location.href = "/login";
        return;
      }
      setErrors(data?.errors ?? { form: "Could not change your password." });
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
      setErrors(data?.errors ?? { form: "Could not change your password." });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setDone(true);
  }

  return (
    <form className="card grid" onSubmit={submit}>
      <h2 className="full" style={{ margin: 0 }}>Change password</h2>
      <p className="hint full" style={{ margin: 0 }}>
        Changing your password signs you out on your other devices, but keeps this session working.
      </p>
      <label className="full">Current password
        <span className="password-field">
          <input
            autoComplete="current-password"
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            type={show ? "text" : "password"}
            value={currentPassword}
          />
          <button onClick={() => setShow((v) => !v)} type="button">{show ? "Hide" : "Show"}</button>
        </span>
        {errors.currentPassword && <span className="error">{errors.currentPassword}</span>}
      </label>
      <label>New password
        <input
          autoComplete="new-password"
          minLength={8}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          type={show ? "text" : "password"}
          value={newPassword}
        />
        {errors.newPassword && <span className="error">{errors.newPassword}</span>}
      </label>
      <label>Confirm new password
        <input
          autoComplete="new-password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          type={show ? "text" : "password"}
          value={confirmPassword}
        />
        {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
      </label>
      {errors.form && <p className="error full" role="alert">{errors.form}</p>}
      <div className="actions full">
        <button className="primary" disabled={busy} type="submit">{busy ? "Saving…" : "Change password"}</button>
        {done && <span className="hint" role="status">Password changed.</span>}
      </div>
    </form>
  );
}
