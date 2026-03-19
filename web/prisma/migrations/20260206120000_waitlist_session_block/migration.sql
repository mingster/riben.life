-- Waitlist session bands (早/午/晚) scoped per store business-hours interval
CREATE TYPE "WaitlistSessionBlock" AS ENUM ('morning', 'afternoon', 'evening');

ALTER TABLE "WaitList" ADD COLUMN "sessionBlock" "WaitlistSessionBlock" NOT NULL DEFAULT 'morning';

CREATE INDEX "WaitList_storeId_sessionBlock_createdAt_idx" ON "WaitList" ("storeId", "sessionBlock", "createdAt");
