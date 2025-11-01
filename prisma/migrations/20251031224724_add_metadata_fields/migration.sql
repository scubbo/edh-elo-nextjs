-- AlterTable
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

