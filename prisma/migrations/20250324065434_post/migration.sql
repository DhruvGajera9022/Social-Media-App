/*
  Warnings:

  - The `media_url` column on the `Posts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Posts" DROP COLUMN "media_url",
ADD COLUMN     "media_url" TEXT[];
