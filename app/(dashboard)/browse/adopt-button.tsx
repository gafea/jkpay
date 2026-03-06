'use client';

import { createBenefitRequest } from '@/app/actions/history';
import { X } from 'lucide-react';
import { useState } from 'react';

type PurchaseChannel = 'ONLINE_PURCHASE' | 'OFFLINE_PURCHASE' | 'FOREIGN_CURRENCY';
const PURCHASE_CHANNELS: PurchaseChannel[] = ['ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY'];
type CashbackType = 'PERCENTAGE' | 'ONE_TIME_CASH';

type CardOption = {
  name: string;
  fcyFee: number | null;
};

type AnyBenefitOption = {
  benefitName: string;
  cashbackType: CashbackType;
  cashbackAmount: number;
  minimumSpending: number | null;
  maximumSpending: number | null;
  purchaseChannel: PurchaseChannel | null;
  cardOptions: CardOption[];
};

type BenefitTypeOption = AnyBenefitOption;

type AdoptButtonProps = {
  benefitId: string;
  benefitName: string;
  cashbackType: CashbackType;
  cashbackAmount: number;
  minimumSpending: number | null;
  maximumSpending: number | null;
  cardOptions: CardOption[];
  isAnyBenefit?: boolean;
  anyBenefitOptions?: AnyBenefitOption[];
  sameTypeBenefitOptions?: BenefitTypeOption[];
  defaultChannel?: PurchaseChannel | null;
  compact?: boolean;
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatRate = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, '')}%`;

const formatSpendRange = (minimumSpending: number | null, maximumSpending: number | null) => {
  if (minimumSpending !== null && maximumSpending !== null) {
    return `$${minimumSpending.toFixed(2)} - $${maximumSpending.toFixed(2)}`;
  }
  if (minimumSpending !== null) {
    return `>$${minimumSpending.toFixed(2)}`;
  }
  if (maximumSpending !== null) {
    return `<$${maximumSpending.toFixed(2)}`;
  }
  return 'Any Spending';
};

const cashbackColorClass = (channel: PurchaseChannel | null) => {
  if (channel === 'ONLINE_PURCHASE') return 'text-blue-600';
  if (channel === 'OFFLINE_PURCHASE') return 'text-emerald-600';
  if (channel === 'FOREIGN_CURRENCY') return 'text-purple-600';
  return 'text-indigo-600';
};

export const AdoptButton = ({
  benefitId,
  benefitName,
  cashbackType,
  cashbackAmount,
  minimumSpending,
  maximumSpending,
  cardOptions,
  isAnyBenefit = false,
  anyBenefitOptions = [],
  sameTypeBenefitOptions = [],
  defaultChannel,
  compact = false,
}: AdoptButtonProps) => {
  const [open, setOpen] = useState(false);
  const [amountSpent, setAmountSpent] = useState('');
  const [purchaseChannel, setPurchaseChannel] = useState<PurchaseChannel | ''>(defaultChannel ?? '');

  const amount = Number(amountSpent);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;
  const inMinRange = minimumSpending === null || !hasValidAmount || amount >= minimumSpending;
  const inMaxRange = maximumSpending === null || !hasValidAmount || amount <= maximumSpending;
  const isWithinSpendRange = inMinRange && inMaxRange;

  const spendRangeLabel = formatSpendRange(minimumSpending, maximumSpending);

  const matchesChannel = (optionChannel: PurchaseChannel | null) => {
    if (!purchaseChannel) return true;
    return optionChannel === null || optionChannel === purchaseChannel;
  };

  const matchesSpend = (min: number | null, max: number | null) => {
    if (!hasValidAmount) return true;
    const passMin = min === null || amount >= min;
    const passMax = max === null || amount <= max;
    return passMin && passMax;
  };

  const sourceOptions = isAnyBenefit
    ? anyBenefitOptions
    : sameTypeBenefitOptions.length > 0
      ? sameTypeBenefitOptions
      : [{
          benefitName,
          cashbackType,
          cashbackAmount,
          minimumSpending,
          maximumSpending,
          purchaseChannel: defaultChannel ?? null,
          cardOptions,
        }];

  const allCandidates = sourceOptions.flatMap((option) =>
    option.cardOptions.map((card) => {
      const effectiveRate =
        option.cashbackType === 'PERCENTAGE'
          ? Math.max(0, option.cashbackAmount - (purchaseChannel === 'FOREIGN_CURRENCY' ? (card.fcyFee ?? 0) : 0))
          : option.cashbackAmount;

      const earnAmount = hasValidAmount
        ? option.cashbackType === 'PERCENTAGE'
          ? (amount * effectiveRate) / 100
          : option.cashbackAmount
        : 0;

      const eligible = matchesChannel(option.purchaseChannel) && matchesSpend(option.minimumSpending, option.maximumSpending);

      return {
        id: `${option.benefitName}-${card.name}-${option.cashbackAmount}-${option.purchaseChannel ?? 'ANY'}`,
        benefitName: option.benefitName,
        cashbackType: option.cashbackType,
        cashbackAmount: option.cashbackAmount,
        purchaseChannel: option.purchaseChannel,
        rangeLabel: formatSpendRange(option.minimumSpending, option.maximumSpending),
        cardName: card.name,
        effectiveRate,
        earnAmount,
        eligible,
      };
    }),
  );

  const activeCandidates = allCandidates.filter((candidate) => candidate.eligible);

  const selectedOrDefaultChannel: PurchaseChannel | null = defaultChannel ?? (purchaseChannel || null);

  const bestAnyCandidate = activeCandidates.reduce<typeof activeCandidates[number] | null>((best, candidate) => {
    if (!best) return candidate;
    if (hasValidAmount) {
      return candidate.earnAmount > best.earnAmount ? candidate : best;
    }
    return candidate.effectiveRate > best.effectiveRate ? candidate : best;
  }, null);

  const effectiveBest = bestAnyCandidate
    ? bestAnyCandidate
      ? {
          id: bestAnyCandidate.id,
          cardName: bestAnyCandidate.cardName,
          cashbackText:
            bestAnyCandidate.cashbackType === 'PERCENTAGE'
              ? formatRate(bestAnyCandidate.effectiveRate)
              : formatMoney(bestAnyCandidate.cashbackAmount),
          cashbackColorClass: cashbackColorClass(bestAnyCandidate.purchaseChannel ?? selectedOrDefaultChannel),
          rangeLabel: bestAnyCandidate.rangeLabel,
          earns: bestAnyCandidate.earnAmount,
          benefitName: bestAnyCandidate.benefitName,
        }
      : null
    : null;

  const youEarns =
    hasValidAmount && effectiveBest
      ? effectiveBest.earns
      : 0;

  const totalNeedToPay = hasValidAmount ? amount - youEarns : 0;
  const savingsPct = hasValidAmount && amount > 0 ? (youEarns / amount) * 100 : 0;
  const jkEarnsCashflow = hasValidAmount ? Math.max(0, totalNeedToPay) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
          : 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'}
      >
        Adopt
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Submit Request</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createBenefitRequest(formData);
                setOpen(false);
              }}
            >
              <input type="hidden" name="benefitId" value={benefitId} />
              <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Benefit: <span className="font-medium">{benefitName}</span>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-600">
                  Amount spent
                  <input
                    type="number"
                    step="1"
                    name="amountSpent"
                    min={1}
                    required
                    value={amountSpent}
                    onChange={(e) => setAmountSpent(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-600">
                  Purchase channel
                  <select
                    name="purchaseChannel"
                    required
                    value={purchaseChannel}
                    onChange={(e) => setPurchaseChannel(e.target.value as PurchaseChannel | '')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select channel</option>
                    {PURCHASE_CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mb-3 rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700">
                <div className="mb-2 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isAnyBenefit ? 'Best Card' : 'Benefits'}
                  </div>
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        {isAnyBenefit && effectiveBest ? (
                          <tr>
                            <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-medium">{effectiveBest.rangeLabel}</td>
                            <td className="px-5 py-3 text-slate-600 truncate max-w-[180px]">{effectiveBest.cardName}</td>
                            <td className={`px-5 py-3 whitespace-nowrap font-bold text-right ${effectiveBest.cashbackColorClass}`}>{effectiveBest.cashbackText}</td>
                          </tr>
                        ) : (
                          allCandidates.map((candidate) => {
                            const isBest = !amountSpent || (effectiveBest && candidate.id === effectiveBest.id);
                            return (
                              <tr key={candidate.id} className={isBest ? 'bg-white' : 'bg-slate-100'}>
                                <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-medium">{candidate.rangeLabel}</td>
                                <td className="px-5 py-3 text-slate-700 truncate max-w-[180px]">
                                  {candidate.cardName}
                                </td>
                                <td className={`px-5 py-3 whitespace-nowrap font-bold text-right ${cashbackColorClass(candidate.purchaseChannel ?? selectedOrDefaultChannel)}`}>
                                  {candidate.cashbackType === 'PERCENTAGE' ? formatRate(candidate.effectiveRate) : formatMoney(candidate.cashbackAmount)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {!effectiveBest && <tr><td className="px-5 py-3 text-slate-500" colSpan={3}>No eligible cards found</td></tr>}
                      </tbody>
                    </table>
                </div>

                <div className="mb-2 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <div className="grid grid-cols-2 gap-2 py-3">
                    <div className="px-5 flex items-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Payment (Est.)
                    </div>
                    <div className="px-5 flex items-center text-xl font-semibold text-slate-800">
                      {formatMoney(totalNeedToPay)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md px-5 py-2">
                    <div className="font-semibold text-slate-500">You earn (Est.)</div>
                    <div className="text-base font-semibold text-slate-700">
                        {formatMoney(youEarns)}
                        <span className="ml-2 text-sm font-medium text-emerald-600">({savingsPct.toFixed(1)}% savings)</span>
                    </div>
                  </div>
                  <div className="rounded-md px-5 py-2">
                    <div className="font-semibold text-slate-500">jk earn (Est.)</div>
                    <div className="text-base font-semibold text-slate-700">{formatMoney(jkEarnsCashflow)} in cashflow</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Submit request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
