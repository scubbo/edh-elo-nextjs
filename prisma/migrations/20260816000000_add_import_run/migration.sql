-- CreateTable
CREATE TABLE IF NOT EXISTS "ImportRun" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "gamesInserted" INTEGER NOT NULL DEFAULT 0,
    "gamesRescored" INTEGER NOT NULL DEFAULT 0,
    "eloReplayedFrom" TIMESTAMP(3),
    "skippedRows" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImportRun_startedAt_idx" ON "ImportRun"("startedAt");
