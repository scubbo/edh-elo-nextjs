/*
  Warnings:

  - You are about to drop the column `elo` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `gamesPlayed` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `losses` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `winRate` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `wins` on the `Deck` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "elo",
DROP COLUMN "gamesPlayed",
DROP COLUMN "losses",
DROP COLUMN "winRate",
DROP COLUMN "wins";
