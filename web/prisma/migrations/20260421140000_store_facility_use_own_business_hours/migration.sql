-- AlterTable
ALTER TABLE "StoreFacility" ADD COLUMN "useOwnBusinessHours" BOOLEAN NOT NULL DEFAULT false;

-- Existing facilities with saved hours should keep using them
UPDATE "StoreFacility"
SET "useOwnBusinessHours" = true
WHERE "businessHours" IS NOT NULL
  AND btrim("businessHours") <> '';
