-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('BARBERSHOP', 'HAIR_SALON', 'NAIL_SALON', 'BEAUTY_SALON', 'MEDICAL', 'DENTAL', 'ELECTRICIAN', 'CONSTRUCTION', 'OTHER');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "category" "BusinessCategory" NOT NULL DEFAULT 'OTHER';
