-- Store Stripe's side of a subscription on the user. The plan field is
-- still what gates limits; the webhook is what flips it. All three new
-- columns start empty: every existing account is free with no Stripe
-- record until it checks out.
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
