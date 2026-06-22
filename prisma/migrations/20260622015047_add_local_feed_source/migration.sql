-- CreateTable
CREATE TABLE "LocalFeedSource" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalFeedSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalFeedSource_url_key" ON "LocalFeedSource"("url");

-- CreateIndex
CREATE INDEX "LocalFeedSource_city_idx" ON "LocalFeedSource"("city");
