-- Add rioCode field to TransitionOrder (required for mobile phone portability)
ALTER TABLE "TransitionOrder" ADD COLUMN "rioCode" TEXT;
