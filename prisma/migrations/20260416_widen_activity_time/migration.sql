-- AlterTable: widen start_time / end_time to allow timezone suffix (e.g. "13:00 KST")
ALTER TABLE "activities" ALTER COLUMN "start_time" TYPE VARCHAR(12);
ALTER TABLE "activities" ALTER COLUMN "end_time" TYPE VARCHAR(12);
