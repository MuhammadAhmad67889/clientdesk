-- Archive clients instead of deleting them.
ALTER TABLE "Client" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
