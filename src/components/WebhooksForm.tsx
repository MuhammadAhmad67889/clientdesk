"use client";

import { useEffect, useState } from "react";
import { WEBHOOK_EVENTS, type WebhookEvent } from "../lib/webhook-events";

interface Subscription {
  active: boolean;
  createdAt: string;
  events: WebhookEvent[];
  id: string;
  url: string;
}

const eventLabels: Record<WebhookEvent, string> = {
  "client.created": "Client added",
  "invoice.created": "Invoice created",
  "invoice.paid": "Invoice paid",
  "payment.recorded": "Payment recorded",
};

export default function WebhooksForm() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["invoice.created", "invoice.paid"]);
  const [note, setNote] = useState("");
  const [secret, setSecret] = useState("");
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/webhooks");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) setSubscriptions((await res.json()) as Subscription[]);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleEvent(event: WebhookEvent) {
    setEvents((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setNote("");
    setSecret("");
    const res = await fetch("/api/webhooks", {
      body: JSON.stringify({ events, url: url.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setNote(body?.error ?? "Could not add the webhook.");
      return;
    }
    const created = (await res.json()) as Subscription & { secret: string };
    setSecret(created.secret);
    setUrl("");
    setNote("Webhook added. Copy the secret below — it is only shown once.");
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) {
      setNote("Webhook removed.");
      await load();
    } else {
      setNote("Could not remove the webhook.");
    }
  }

  async function test(id: string, event: WebhookEvent) {
    const res = await fetch(`/api/webhooks/${id}/test`, {
      body: JSON.stringify({ event }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const body = (await res.json().catch(() => null)) as { ok?: boolean; status?: number } | null;
    setTestResults((current) => ({
      ...current,
      [id]: body && typeof body.status === "number"
        ? body.ok
          ? `Test sent — Zapier answered ${body.status}.`
          : `Test failed — Zapier answered ${body.status}.`
        : "Test failed — no answer from the webhook URL.",
    }));
  }

  return (
    <div className="card grid">
      <h2 className="full" style={{ margin: 0 }}>Webhooks (Zapier)</h2>
      <p className="hint full" style={{ margin: 0 }}>
        ClientDesk posts a small JSON payload to your webhook URL whenever
        one of the events below happens. In Zapier, create a Zap with
        Webhooks by Zapier → Catch Hook, copy the webhook URL it gives
        you, paste it here, pick the events, then test it.
      </p>
      {subscriptions.length > 0 && (
        <ul className="full" style={{ margin: 0, paddingLeft: 20 }}>
          {subscriptions.map((sub) => (
            <li key={sub.id} style={{ marginBottom: 8 }}>
              <span style={{ overflowWrap: "anywhere" }}>{sub.url}</span>
              <br />
              <span className="hint">
                {sub.events.map((e) => eventLabels[e]).join(" · ")} · added {sub.createdAt}
              </span>
              <br />
              <button onClick={() => test(sub.id, sub.events[0] ?? "invoice.created")} type="button">Test</button>{" "}
              <button className="danger" onClick={() => remove(sub.id)} type="button">Delete</button>
              {testResults[sub.id] && (
                <span className="hint" role="status"> — {testResults[sub.id]}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {secret && (
        <p className="full" style={{ margin: 0, overflowWrap: "anywhere" }}>
          <strong>Secret (shown once):</strong> {secret}
          <br />
          <span className="hint">
            Zapier receives it as the X-ClientDesk-Signature header — an
            HMAC-SHA256 of the payload, made with this secret.
          </span>
        </p>
      )}
      <form className="full grid" onSubmit={submit}>
        <label className="full">Webhook URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/…"
            maxLength={2048}
          />
        </label>
        <fieldset className="full" style={{ border: "none", margin: 0, padding: 0 }}>
          <legend>Events to send</legend>
          {WEBHOOK_EVENTS.map((event) => (
            <label key={event} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => toggleEvent(event)}
              />{" "}
              {eventLabels[event]} <span className="hint">({event})</span>
            </label>
          ))}
        </fieldset>
        <div className="actions full">
          <button className="primary" disabled={saving} type="submit">{saving ? "Adding…" : "Add webhook"}</button>
          {note && <span className="hint" role="status">{note}</span>}
        </div>
      </form>
    </div>
  );
}
