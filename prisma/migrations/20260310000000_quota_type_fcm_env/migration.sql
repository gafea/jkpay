-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "QuotaType" AS ENUM ('CAP', 'COUNT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "FriendAccess"
ADD COLUMN IF NOT EXISTS "fcmToken" TEXT;

-- AlterTable
ALTER TABLE "Benefit"
ADD COLUMN IF NOT EXISTS "quotaType" "QuotaType" NOT NULL DEFAULT 'CAP';
