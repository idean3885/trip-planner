/*
  Warnings:

  - The primary key for the `days` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `days` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `invitations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `invitations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `invitations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `trips` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `owner_id` on the `trips` table. All the data in the column will be lost.
  - The `id` column on the `trips` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `members` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `trip_id` on the `days` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `trip_id` on the `invitations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `created_by` to the `trips` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_by` to the `trips` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TripRole" AS ENUM ('HOST', 'GUEST');

-- DropForeignKey
ALTER TABLE "days" DROP CONSTRAINT "days_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trips" DROP CONSTRAINT "trips_owner_id_fkey";

-- AlterTable
ALTER TABLE "days" DROP CONSTRAINT "days_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "trip_id",
ADD COLUMN     "trip_id" INTEGER NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3),
ADD CONSTRAINT "days_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "trip_id",
ADD COLUMN     "trip_id" INTEGER NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "TripRole" NOT NULL DEFAULT 'GUEST',
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "trips" DROP CONSTRAINT "trips_pkey",
DROP COLUMN "owner_id",
ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "updated_by" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3),
ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "members";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "trip_members" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TripRole" NOT NULL DEFAULT 'GUEST',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_members_trip_id_user_id_key" ON "trip_members"("trip_id", "user_id");

-- CreateIndex
CREATE INDEX "days_trip_id_date_idx" ON "days"("trip_id", "date");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "days" ADD CONSTRAINT "days_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
