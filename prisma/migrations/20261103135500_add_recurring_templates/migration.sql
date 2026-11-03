-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "amount" DOUBLE PRECISION NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "id" TEXT NOT NULL PRIMARY KEY,
    "nextDueDate" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    CONSTRAINT "RecurringTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecurringTemplate_userId_idx" ON "RecurringTemplate" ("userId");

-- CreateIndex
CREATE INDEX "RecurringTemplate_clientId_idx" ON "RecurringTemplate" ("clientId");
