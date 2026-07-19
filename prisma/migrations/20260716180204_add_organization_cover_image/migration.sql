-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "coverImageUrl" TEXT;

-- AlterTable
ALTER TABLE "serviceImage" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);
