-- AlterTable
ALTER TABLE "GoogleAccount" ADD COLUMN     "hiddenCalendarIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
