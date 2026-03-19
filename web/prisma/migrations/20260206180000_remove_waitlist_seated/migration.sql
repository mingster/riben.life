-- Remove waitlist table assignment and seated state; migrate existing seated rows to called
ALTER TABLE "WaitList" DROP COLUMN IF EXISTS "seatedAt";
ALTER TABLE "WaitList" DROP COLUMN IF EXISTS "facilityId";

ALTER TABLE "WaitList" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WaitList" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
UPDATE "WaitList" SET "status" = 'called' WHERE "status" = 'seated';
DROP TYPE "WaitListStatus";
CREATE TYPE "WaitListStatus" AS ENUM ('waiting', 'called', 'cancelled', 'no_show');
ALTER TABLE "WaitList" ALTER COLUMN "status" TYPE "WaitListStatus" USING ("status"::"WaitListStatus");
ALTER TABLE "WaitList" ALTER COLUMN "status" SET DEFAULT 'waiting'::"WaitListStatus";
