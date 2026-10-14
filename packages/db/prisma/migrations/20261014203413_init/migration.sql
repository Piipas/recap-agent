-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'NEEDS_RECONNECT');

-- CreateEnum
CREATE TYPE "MailboxProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "RepoType" AS ENUM ('USER', 'ORG');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecapStatus" AS ENUM ('DRAFT', 'PENDING_CONFIRMATION', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "SendTrigger" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_source" (
    "userId" TEXT NOT NULL,
    "githubUserId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_source_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "groq_key" (
    "userId" TEXT NOT NULL,
    "keyEnc" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groq_key_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "mailbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MailboxProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "timeOfDay" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "repoTypes" "RepoType"[],
    "language" TEXT NOT NULL,
    "mailboxId" TEXT,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recap_run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "day" DATE NOT NULL,
    "repoTypes" "RepoType"[],
    "language" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recap_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "RecapStatus" NOT NULL DEFAULT 'DRAFT',
    "mailboxId" TEXT,
    "recipients" TEXT[],
    "sendLockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "send_log" (
    "id" TEXT NOT NULL,
    "recapId" TEXT NOT NULL,
    "mailboxId" TEXT,
    "provider" "MailboxProvider" NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "recipients" TEXT[],
    "trigger" "SendTrigger" NOT NULL,
    "status" "SendStatus" NOT NULL,
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "send_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ManagerToSchedule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ManagerToSchedule_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "mailbox_userId_idx" ON "mailbox"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mailbox_userId_provider_providerAccountId_key" ON "mailbox"("userId", "provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "manager_userId_email_key" ON "manager"("userId", "email");

-- CreateIndex
CREATE INDEX "schedule_enabled_nextRunAt_idx" ON "schedule"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "schedule_userId_idx" ON "schedule"("userId");

-- CreateIndex
CREATE INDEX "recap_run_status_createdAt_idx" ON "recap_run"("status", "createdAt");

-- CreateIndex
CREATE INDEX "recap_run_userId_createdAt_idx" ON "recap_run"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "recap_run_scheduleId_scheduledFor_key" ON "recap_run"("scheduleId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "recap_runId_key" ON "recap"("runId");

-- CreateIndex
CREATE INDEX "recap_userId_createdAt_idx" ON "recap"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "send_log_recapId_idx" ON "send_log"("recapId");

-- CreateIndex
CREATE INDEX "_ManagerToSchedule_B_index" ON "_ManagerToSchedule"("B");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_source" ADD CONSTRAINT "github_source_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groq_key" ADD CONSTRAINT "groq_key_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailbox" ADD CONSTRAINT "mailbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager" ADD CONSTRAINT "manager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recap_run" ADD CONSTRAINT "recap_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recap_run" ADD CONSTRAINT "recap_run_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recap" ADD CONSTRAINT "recap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recap" ADD CONSTRAINT "recap_runId_fkey" FOREIGN KEY ("runId") REFERENCES "recap_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recap" ADD CONSTRAINT "recap_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_log" ADD CONSTRAINT "send_log_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "recap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_log" ADD CONSTRAINT "send_log_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ManagerToSchedule" ADD CONSTRAINT "_ManagerToSchedule_A_fkey" FOREIGN KEY ("A") REFERENCES "manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ManagerToSchedule" ADD CONSTRAINT "_ManagerToSchedule_B_fkey" FOREIGN KEY ("B") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
