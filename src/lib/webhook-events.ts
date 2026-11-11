/** The events ClientDesk can post to a webhook URL.
 * Kept in its own file with no server imports, so the Settings
 * form can use the same list as the server code. */
export const WEBHOOK_EVENTS = ["client.created", "invoice.created", "invoice.paid", "payment.recorded"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
