-- AlterTable
ALTER TABLE "FriendAccess"
DROP COLUMN IF EXISTS "monthlyLimit",
ADD COLUMN IF NOT EXISTS "nickname" TEXT;

-- AlterTable
ALTER TABLE "Card"
DROP COLUMN IF EXISTS "expiryDate",
DROP COLUMN IF EXISTS "monthlyLimit";

-- AlterTable
ALTER TABLE "Benefit" ADD COLUMN IF NOT EXISTS "usageResetAt" TIMESTAMP(3);
