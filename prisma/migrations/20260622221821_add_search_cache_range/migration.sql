-- CreateTable
CREATE TABLE "SearchCacheRange" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "filterKey" TEXT NOT NULL,
    "cachedStart" TIMESTAMP(3) NOT NULL,
    "cachedEnd" TIMESTAMP(3) NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchCacheRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchCacheRange_sourceName_filterKey_key" ON "SearchCacheRange"("sourceName", "filterKey");
