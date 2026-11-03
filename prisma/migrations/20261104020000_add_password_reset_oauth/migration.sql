-- Password reset tokens (one hour, single-use) and OAuth account links.
ALTER TABLE "User" ADD COLUMN "githubId" TEXT;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

CREATE TABLE "PasswordResetToken" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
