-- Webhook subscriptions: a user's own URL, for Zapier and similar tools.
CREATE TABLE "WebhookSubscription" (
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "events" TEXT[] NOT NULL,
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookSubscription_userId_idx" ON "WebhookSubscription"("userId");

ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
