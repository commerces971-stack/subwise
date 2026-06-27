/*
  Warnings:

  - Made the column `mailevaCost` on table `TransitionOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TransitionOrder" ADD COLUMN     "alternativeId" TEXT,
ADD COLUMN     "alternativeName" TEXT,
ADD COLUMN     "mandatSignedAt" TIMESTAMP(3),
ADD COLUMN     "providerAddress" JSONB,
ADD COLUMN     "userAddress" JSONB,
ALTER COLUMN "mailevaCost" SET NOT NULL,
ALTER COLUMN "mailevaCost" SET DEFAULT 6.50;
