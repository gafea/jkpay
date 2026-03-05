-- CreateEnum
CREATE TYPE "CashbackType" AS ENUM ('PERCENTAGE', 'ONE_TIME_CASH');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "PurchaseChannel" AS ENUM ('ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendAccess" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(12,2),
    "activeUntil" TIMESTAMP(3),
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "monthlyLimit" DECIMAL(12,2) NOT NULL,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benefit" (
    "id" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "cashbackType" "CashbackType" NOT NULL,
    "cashbackAmount" DECIMAL(12,2) NOT NULL,
    "usageAvailable" INTEGER,
    "minimumSpending" DECIMAL(12,2),
    "maximumSpending" DECIMAL(12,2),
    "applicableWeekdays" "Weekday"[],
    "purchaseChannels" "PurchaseChannel"[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitCard" (
    "id" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "BenefitCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "amountSpent" DECIMAL(12,2) NOT NULL,
    "purchaseChannel" "PurchaseChannel" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FriendAccess_friendId_idx" ON "FriendAccess"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendAccess_ownerId_friendId_key" ON "FriendAccess"("ownerId", "friendId");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitCard_benefitId_cardId_key" ON "BenefitCard"("benefitId", "cardId");

-- CreateIndex
CREATE INDEX "BenefitRequest_userId_createdAt_idx" ON "BenefitRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "FriendAccess" ADD CONSTRAINT "FriendAccess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendAccess" ADD CONSTRAINT "FriendAccess_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitCard" ADD CONSTRAINT "BenefitCard_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "Benefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitCard" ADD CONSTRAINT "BenefitCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitRequest" ADD CONSTRAINT "BenefitRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitRequest" ADD CONSTRAINT "BenefitRequest_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "Benefit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
