-- AlterTable
ALTER TABLE "RsvpSettings" ADD COLUMN "requireSignIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RsvpSettings" ADD COLUMN "requireName" BOOLEAN NOT NULL DEFAULT false;
