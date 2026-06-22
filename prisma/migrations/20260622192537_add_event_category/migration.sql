-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MUSIC', 'SPORTS', 'COMEDY', 'ARTS_THEATER', 'FILM', 'FOOD_DRINK', 'COMMUNITY', 'FAMILY', 'OTHER');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "category" "EventCategory" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");
