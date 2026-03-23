-- Store-user Google Calendar OAuth + RSVP event mapping (relationMode=prisma: no DB FKs)
CREATE TABLE "StoreUserGoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessTokenExpiresAt" BIGINT,
    "isInvalid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "StoreUserGoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreUserGoogleCalendarConnection_storeId_userId_key" ON "StoreUserGoogleCalendarConnection"("storeId", "userId");
CREATE INDEX "StoreUserGoogleCalendarConnection_storeId_idx" ON "StoreUserGoogleCalendarConnection"("storeId");
CREATE INDEX "StoreUserGoogleCalendarConnection_userId_idx" ON "StoreUserGoogleCalendarConnection"("userId");

CREATE TABLE "RsvpGoogleCalendarEvent" (
    "id" TEXT NOT NULL,
    "rsvpId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "RsvpGoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RsvpGoogleCalendarEvent_rsvpId_key" ON "RsvpGoogleCalendarEvent"("rsvpId");
CREATE INDEX "RsvpGoogleCalendarEvent_storeId_idx" ON "RsvpGoogleCalendarEvent"("storeId");
CREATE INDEX "RsvpGoogleCalendarEvent_targetUserId_idx" ON "RsvpGoogleCalendarEvent"("targetUserId");
