-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "hikeTripId" TEXT;

-- CreateTable
CREATE TABLE "HikeTrip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikeTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_hikeTripId_idx" ON "Activity"("hikeTripId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_hikeTripId_fkey" FOREIGN KEY ("hikeTripId") REFERENCES "HikeTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
