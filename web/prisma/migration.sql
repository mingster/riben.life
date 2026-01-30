-- Prevent multiple unsent EmailQueue rows per notification (one email per notification).
-- Partial unique index: only one row with same notificationId when sentOn IS NULL.
CREATE UNIQUE INDEX "EmailQueue_one_unsent_per_notification" ON "EmailQueue" ("notificationId") 
WHERE "sentOn" IS NULL AND "notificationId" IS NOT NULL;
