/*
  Warnings:

  - A unique constraint covering the columns `[name,ownerId]` on the table `Deck` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Deck_name_ownerId_key" ON "Deck"("name", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");
