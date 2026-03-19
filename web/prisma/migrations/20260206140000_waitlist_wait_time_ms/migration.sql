-- Persist total wait duration when a waitlist party is called
ALTER TABLE "WaitList" ADD COLUMN "waitTimeMs" BIGINT;
