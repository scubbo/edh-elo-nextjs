/*
  Warnings:

  - The primary key for the `Deck` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Deck` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `ownerId` on the `Deck` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerId_fkey";

-- AlterTable
ALTER TABLE "Deck" DROP CONSTRAINT "Deck_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "ownerId",
ADD COLUMN     "ownerId" INTEGER NOT NULL,
ADD CONSTRAINT "Deck_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "WinTypes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WinTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formats" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "deckIds" INTEGER[],
    "winningDeckIds" INTEGER[],
    "numberOfTurns" INTEGER NOT NULL,
    "firstPlayerOutTurn" INTEGER NOT NULL,
    "winTypeId" INTEGER NOT NULL,
    "formatId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deck_ownerId_idx" ON "Deck"("ownerId");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winTypeId_fkey" FOREIGN KEY ("winTypeId") REFERENCES "WinTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Formats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
