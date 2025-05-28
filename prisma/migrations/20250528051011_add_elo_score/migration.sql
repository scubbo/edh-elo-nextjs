-- CreateTable
CREATE TABLE "EloScore" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "deckId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "EloScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EloScore_deckId_idx" ON "EloScore"("deckId");

-- CreateIndex
CREATE INDEX "EloScore_gameId_idx" ON "EloScore"("gameId");

-- AddForeignKey
ALTER TABLE "EloScore" ADD CONSTRAINT "EloScore_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EloScore" ADD CONSTRAINT "EloScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
