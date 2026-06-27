-- Add cancellation-specific fields to TransitionOrder
ALTER TABLE "TransitionOrder" ADD COLUMN "customerNumber" TEXT;
ALTER TABLE "TransitionOrder" ADD COLUMN "contractRef" TEXT;
