import { prisma } from '@/lib/prisma';

export const resetMonthlyBenefitUsage = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.benefit.updateMany({
    where: {
      quotaResetsMonthly: true,
      usageAvailable: { gt: 0 },
      AND: [
        { OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] },
        { OR: [{ usageResetAt: null }, { usageResetAt: { lt: monthStart } }] },
      ],
    },
    data: {
      usageUsed: 0,
      usageResetAt: now,
    },
  });
};
