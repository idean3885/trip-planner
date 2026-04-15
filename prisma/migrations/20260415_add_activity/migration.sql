-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('SIGHTSEEING', 'DINING', 'TRANSPORT', 'ACCOMMODATION', 'SHOPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('REQUIRED', 'RECOMMENDED', 'ON_SITE', 'NOT_NEEDED');

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "day_id" INTEGER NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "location" TEXT,
    "memo" TEXT,
    "cost" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "reservation_status" "ReservationStatus",
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_day_id_start_time_idx" ON "activities"("day_id", "start_time");

-- CreateIndex
CREATE INDEX "activities_day_id_sort_order_idx" ON "activities"("day_id", "sort_order");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

