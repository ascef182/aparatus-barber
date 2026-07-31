-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
