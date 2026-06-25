-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'LOCAL_VENUE';

-- CreateTable
CREATE TABLE "VenueSource" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "readable" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VenueSource_url_key" ON "VenueSource"("url");
