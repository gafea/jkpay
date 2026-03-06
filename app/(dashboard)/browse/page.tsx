import { ensureBrowseHistoryAccess } from '@/lib/access';
import { resetMonthlyBenefitUsage } from '@/lib/benefits';
import { prisma } from '@/lib/prisma';
import { Globe, Store, Plane } from 'lucide-react';
import type { ComponentType } from 'react';
import { AdoptButton } from './adopt-button';

type BrowseCardLink = {
  cardId: string;
  card: {
    id: string;
    name: string;
    fcyFee: number | null;
  };
};

type BrowseBenefit = {
  id: string;
  categoryName: string;
  expiryDate: Date | null;
  cashbackType: 'PERCENTAGE' | 'ONE_TIME_CASH';
  cashbackAmount: number;
  usageAvailable: number | null;
  minimumSpending: number | null;
  maximumSpending: number | null;
  applicableWeekdays: string[];
  purchaseChannel: 'ONLINE_PURCHASE' | 'OFFLINE_PURCHASE' | 'FOREIGN_CURRENCY' | null;
  cardLinks: BrowseCardLink[];
};

type ChannelGroupOption = BrowseBenefit & {
  effectiveCashback: number;
  cardName: string;
};

type AnyBenefitOption = {
  benefitName: string;
  cashbackType: BrowseBenefit['cashbackType'];
  cashbackAmount: number;
  minimumSpending: number | null;
  maximumSpending: number | null;
  purchaseChannel: BrowseBenefit['purchaseChannel'];
  cardOptions: { name: string; fcyFee: number | null }[];
};

export default async function BrowsePage() {
  await ensureBrowseHistoryAccess();
  await resetMonthlyBenefitUsage();

  const dbBenefits = await prisma.benefit.findMany({
    where: {
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } }
      ]
    },
    include: {
      cardLinks: {
        where: { card: { isDisabled: false } },
        include: { card: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rawBenefits: BrowseBenefit[] = dbBenefits.map((benefit: (typeof dbBenefits)[number]) => ({
    id: benefit.id,
    categoryName: benefit.categoryName,
    expiryDate: benefit.expiryDate,
    cashbackType: benefit.cashbackType,
    cashbackAmount: Number(benefit.cashbackAmount),
    usageAvailable: benefit.usageAvailable,
    minimumSpending: benefit.minimumSpending === null ? null : Number(benefit.minimumSpending),
    maximumSpending: benefit.maximumSpending === null ? null : Number(benefit.maximumSpending),
    applicableWeekdays: benefit.applicableWeekdays,
    purchaseChannel: benefit.purchaseChannel,
    cardLinks: benefit.cardLinks.map((link: (typeof benefit.cardLinks)[number]) => ({
      cardId: link.cardId,
      card: {
        id: link.card.id,
        name: link.card.name,
        fcyFee: link.card.fcyFee === null ? null : Number(link.card.fcyFee),
      },
    })),
  }));

  const benefits = rawBenefits.filter((benefit: BrowseBenefit) => benefit.cardLinks.length > 0);

  const formatSpendRange = (minimumSpending: { toString(): string } | null, maximumSpending: { toString(): string } | null) => {
    if (minimumSpending !== null && maximumSpending !== null) {
      return `$${minimumSpending.toString()} - $${maximumSpending.toString()}`;
    }
    if (minimumSpending === null && maximumSpending !== null) {
      return `$0 - $${maximumSpending.toString()}`;
    }
    if (minimumSpending !== null && maximumSpending === null) {
      return `At least $${minimumSpending.toString()}`;
    }
    return null;
  };

  const benefitsByCategory = benefits.reduce((acc: Record<string, BrowseBenefit[]>, benefit: BrowseBenefit) => {
    const cat = benefit.categoryName || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(benefit);
    return acc;
  }, {} as Record<string, typeof benefits>);

  // Sort categories alphabetically
  const categories = Object.keys(benefitsByCategory).sort();

  for (const cat of categories) {
    benefitsByCategory[cat].sort((a: BrowseBenefit, b: BrowseBenefit) => {
      if (a.cashbackType === 'PERCENTAGE' && b.cashbackType !== 'PERCENTAGE') return -1;
      if (a.cashbackType !== 'PERCENTAGE' && b.cashbackType === 'PERCENTAGE') return 1;
      return Number(b.cashbackAmount) - Number(a.cashbackAmount);
    });
  }

  const anyBenefitOptions: AnyBenefitOption[] = (benefitsByCategory['Any'] || []).map((benefit) => ({
    benefitName: benefit.categoryName,
    cashbackType: benefit.cashbackType,
    cashbackAmount: benefit.cashbackAmount,
    minimumSpending: benefit.minimumSpending,
    maximumSpending: benefit.maximumSpending,
    purchaseChannel: benefit.purchaseChannel,
    cardOptions: benefit.cardLinks.map((link) => ({
      name: link.card.name,
      fcyFee: link.card.fcyFee,
    })),
  }));

  const getChannelGroups = (channel: string) => {
    const anyBenefits = benefitsByCategory['Any'] || [];
    const percentages = anyBenefits.filter(
      (benefit: BrowseBenefit) =>
        benefit.cashbackType === 'PERCENTAGE' && (benefit.purchaseChannel === channel || !benefit.purchaseChannel),
    );
    
    const options = percentages.flatMap((benefit: BrowseBenefit) => {
      return benefit.cardLinks.map((link: BrowseCardLink): ChannelGroupOption => {
        const card = link.card;
        let effectiveCashback = Number(benefit.cashbackAmount);
        if (channel === 'FOREIGN_CURRENCY' && card.fcyFee) {
          effectiveCashback -= Number(card.fcyFee);
        }
        return {
          ...benefit,
          effectiveCashback,
          cardName: card.name,
        };
      });
    });

    const groups: Record<string, ChannelGroupOption[]> = {};
    for (const opt of options) {
      const min = opt.minimumSpending ? opt.minimumSpending.toString() : '0';
      const max = opt.maximumSpending ? opt.maximumSpending.toString() : 'any';
      const key = `${min}-${max}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    }
    
    const maxes = Object.values(groups).map((group) => {
      const maxCb = Math.max(...group.map((option) => option.effectiveCashback));
      const best = group.filter((option) => option.effectiveCashback === maxCb);
      const bestBenefit = best[0];
      return {
        ...bestBenefit,
        effectiveCashback: maxCb,
        benefitId: bestBenefit.id,
        cardNames: Array.from(new Set(best.map((option) => option.cardName))).join(', ')
      };
    });
    
    maxes.sort((a, b) => b.effectiveCashback - a.effectiveCashback);
    return maxes;
  };

  const getMaxBenefitInfo = (channel: string, label: string, colorClass: string, Icon: ComponentType<{ className?: string }>) => {
    const maxes = getChannelGroups(channel);
    if (!maxes || maxes.length === 0) return null;
    const b = maxes[0];
    const others = maxes.slice(1);

    return (
      <div className="flex flex-col h-full rounded-xl shadow-md overflow-hidden bg-white border border-slate-200">
        <div className={`flex flex-col justify-between bg-gradient-to-br flex-1 ${colorClass} p-5 text-white`}>
          <div>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-white/90" />
              <div className="text-sm font-medium text-white/90 uppercase tracking-wider">{label}</div>
            </div>
            <div className="mt-2 flex flex-col items-start gap-1">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">{b.effectiveCashback.toFixed(2).replace(/\.?0+$/, '')}%</span>
                <span className="ml-2 text-sm font-medium text-white/80 uppercase tracking-wide">
                  Cashback
                </span>
              </div>
              <span className="text-sm font-medium text-white/80">with {b.cardNames}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-sm text-white/90">
            {(b.minimumSpending !== null || b.maximumSpending !== null) && (
              <div>
                Spend: {formatSpendRange(b.minimumSpending, b.maximumSpending)}
              </div>
            )}
            {b.usageAvailable !== null && (
              <div>Quota: {b.usageAvailable.toString()}</div>
            )}
            <div className="pt-1">
              <AdoptButton
                benefitId={b.benefitId}
                benefitName={b.categoryName}
                cashbackType={b.cashbackType}
                cashbackAmount={b.cashbackAmount}
                minimumSpending={b.minimumSpending}
                maximumSpending={b.maximumSpending}
                cardOptions={b.cardLinks.map((link: BrowseCardLink) => ({
                  name: link.card.name,
                  fcyFee: link.card.fcyFee,
                }))}
                isAnyBenefit
                anyBenefitOptions={anyBenefitOptions}
                defaultChannel={b.purchaseChannel}
              />
            </div>
          </div>
        </div>
        {others.length > 0 && (
          <div className="flex flex-col bg-white text-slate-800 text-sm">
            <table className="w-full text-left border-collapse">
              <tbody>
                {others.map((other, idx) => {
                  const rangeStr = formatSpendRange(other.minimumSpending, other.maximumSpending) ?? 'Any Spending';
                  return (
                    <tr key={idx} className={idx !== others.length - 1 ? "border-b border-slate-100" : ""}>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-medium">{rangeStr}</td>
                      <td className="px-5 py-3 text-slate-600 truncate max-w-[120px]">{other.cardNames}</td>
                      <td className={`px-5 py-3 whitespace-nowrap font-bold text-right ${colorClass.includes('blue') ? 'text-blue-600' : colorClass.includes('emerald') ? 'text-emerald-600' : 'text-purple-600'}`}>{other.effectiveCashback.toFixed(2).replace(/\.?0+$/, '')}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Browse Benefits</h1>

      {categories.length === 0 ? (
        <p className="text-slate-500">No benefits found.</p>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => {
            const cardGrid = (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {benefitsByCategory[category].map((benefit: BrowseBenefit) => (
                  <div
                    key={benefit.id}
                    className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-4 flex flex-col items-start gap-2">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold tracking-tight text-indigo-600">
                          {benefit.cashbackType === 'PERCENTAGE'
                            ? `${benefit.cashbackAmount.toString()}%`
                            : `$${benefit.cashbackAmount.toString()}`}
                        </span>
                        <span className="ml-2 text-sm font-medium text-slate-500 uppercase tracking-wide">
                          Cashback
                        </span>
                      </div>
                      {benefit.purchaseChannel && (
                        <div className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          benefit.purchaseChannel === 'ONLINE_PURCHASE' ? 'bg-blue-100 text-blue-800' :
                          benefit.purchaseChannel === 'OFFLINE_PURCHASE' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {benefit.purchaseChannel === 'ONLINE_PURCHASE' ? 'Online Only' :
                           benefit.purchaseChannel === 'OFFLINE_PURCHASE' ? 'Offline Only' :
                           'Foreign Currency Only'}
                        </div>
                      )}
                      {benefit.expiryDate && (
                        <div className="text-sm font-medium text-amber-600">
                          {Math.max(0, Math.ceil((benefit.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                        </div>
                      )}
                    </div>

                    <div className="mt-auto space-y-1.5 text-sm text-slate-600">
                      {benefit.cardLinks.length > 0 && (
                        <div className="flex gap-2">
                          <span className="font-medium text-slate-900 min-w-[70px]">Cards:</span>
                          <span className="text-slate-700">{benefit.cardLinks.map((link: BrowseCardLink) => link.card.name).join(', ')}</span>
                        </div>
                      )}

                      {benefit.expiryDate && (
                        <div className="flex gap-2">
                          <span className="font-medium text-slate-900 min-w-[70px]">Expiry:</span>
                          <span className="text-slate-700">{benefit.expiryDate.toISOString().slice(0, 10)}</span>
                        </div>
                      )}

                      {benefit.usageAvailable !== null && (
                        <div className="flex gap-2">
                          <span className="font-medium text-slate-900 min-w-[70px]">Quota:</span>
                          <span className="text-slate-700">{benefit.usageAvailable.toString()}</span>
                        </div>
                      )}

                      {benefit.minimumSpending !== null && (
                        <div className="flex gap-2">
                          <span className="font-medium text-slate-900 min-w-[70px]">Min Spend:</span>
                          <span className="text-slate-700">${benefit.minimumSpending.toString()}</span>
                        </div>
                      )}

                      {benefit.maximumSpending !== null && (
                        <div className="flex gap-2">
                          <span className="font-medium text-slate-900 min-w-[70px]">Max Spend:</span>
                          <span className="text-slate-700">${benefit.maximumSpending.toString()}</span>
                        </div>
                      )}

                      {benefit.applicableWeekdays.length > 0 && (
                        <div className="flex gap-2">
                          <span className="font-medium text-slate-900 min-w-[70px]">Days:</span>
                          <span className="text-slate-700">{benefit.applicableWeekdays.join(', ')}</span>
                        </div>
                      )}

                      {category !== 'Any' && (
                        <div className="pt-2">
                          <AdoptButton
                            benefitId={benefit.id}
                            benefitName={benefit.categoryName}
                            cashbackType={benefit.cashbackType}
                            cashbackAmount={benefit.cashbackAmount}
                            minimumSpending={benefit.minimumSpending}
                            maximumSpending={benefit.maximumSpending}
                            cardOptions={benefit.cardLinks.map((link: BrowseCardLink) => ({
                              name: link.card.name,
                              fcyFee: link.card.fcyFee,
                            }))}
                            sameTypeBenefitOptions={benefitsByCategory[category].map((typeBenefit) => ({
                              benefitName: typeBenefit.categoryName,
                              cashbackType: typeBenefit.cashbackType,
                              cashbackAmount: typeBenefit.cashbackAmount,
                              minimumSpending: typeBenefit.minimumSpending,
                              maximumSpending: typeBenefit.maximumSpending,
                              purchaseChannel: typeBenefit.purchaseChannel,
                              cardOptions: typeBenefit.cardLinks.map((typeLink) => ({
                                name: typeLink.card.name,
                                fcyFee: typeLink.card.fcyFee,
                              })),
                            }))}
                            defaultChannel={benefit.purchaseChannel}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );

            return (
              <section key={category} className="space-y-4">
                <h2 className="text-xl font-medium text-slate-800 border-b border-slate-200 pb-2">
                  {category}
                </h2>
                
                {category === 'Any' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                    {getMaxBenefitInfo('ONLINE_PURCHASE', 'Online', 'from-blue-500 to-cyan-600', Globe)}
                    {getMaxBenefitInfo('OFFLINE_PURCHASE', 'Offline', 'from-emerald-500 to-teal-600', Store)}
                    {getMaxBenefitInfo('FOREIGN_CURRENCY', 'Foreign Currency', 'from-purple-500 to-fuchsia-600', Plane)}
                  </div>
                )}

                {category === 'Any' ? (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-500 uppercase tracking-widest hover:text-slate-800 list-none mb-4 flex items-center gap-2 transition-colors">
                      <span className="text-[10px] transition-transform group-open:-rotate-180">▼</span>
                      Other Benefit Cards
                    </summary>
                    {cardGrid}
                  </details>
                ) : (
                  cardGrid
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
