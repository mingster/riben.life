-- AlterTable
ALTER TABLE "RsvpSettings" ADD COLUMN "requirePhone" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WaitListSettings" ADD COLUMN "requirePhone" BOOLEAN NOT NULL DEFAULT false;
