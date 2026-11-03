-- Add a plan to the user. Every existing account becomes free; Pro and
-- Business unlock in Phase 2 when billing ships, so no account changes
-- tier because of this migration.
ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';
