/*
  Warnings:

  - You are about to drop the `Formats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WinTypes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_formatId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_winTypeId_fkey";

-- DropTable
DROP TABLE "Formats";

-- DropTable
DROP TABLE "WinTypes";

-- CreateTable
CREATE TABLE "WinType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WinType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Format" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Format_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winTypeId_fkey" FOREIGN KEY ("winTypeId") REFERENCES "WinType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Format"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
