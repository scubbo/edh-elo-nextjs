-- An import run now reports how far it got, so a run stopped by the function's
-- time limit can be told from one that finished, and the games it did not reach
-- can be counted.
ALTER TABLE "ImportRun" ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);
ALTER TABLE "ImportRun" ADD COLUMN IF NOT EXISTS "gamesDeleted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ImportRun" ADD COLUMN IF NOT EXISTS "gamesRemaining" INTEGER NOT NULL DEFAULT 0;

-- The import no longer rescores games in place: it discards the history from the
-- point the spreadsheet disagrees with it and reads that history afresh.
ALTER TABLE "ImportRun" RENAME COLUMN "eloReplayedFrom" TO "rebuiltFrom";
ALTER TABLE "ImportRun" DROP COLUMN IF EXISTS "gamesRescored";
