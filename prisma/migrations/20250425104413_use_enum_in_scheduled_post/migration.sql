/*
  Warnings:

  - Changed the type of `status` on the `ScheduledPost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ScheduledPost" DROP COLUMN "status",
ADD COLUMN     "status" "PostStatus" NOT NULL;
