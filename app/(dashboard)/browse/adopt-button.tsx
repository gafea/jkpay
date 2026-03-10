'use client';

import { createBenefitRequest } from '@/app/actions/history';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type PurchaseChannel = 'ONLINE_PURCHASE' | 'OFFLINE_PURCHASE' | 'FOREIGN_CURRENCY';
const PURCHASE_CHANNELS: PurchaseChannel[] = ['ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY'];
type CashbackType = 'PERCENTAGE' | 'ONE_TIME_CASH';

type CardOption = {
  name: string;
  fcyFee: number | null;
  isCredit: boolean;
};

type AnyBenefitOption = {
  benefitName: string;
  cashbackType: CashbackType;
  cashbackAmount: number;
  quotaType: 'CAP' | 'COUNT';
  usageAvailable: number | null;
  usageUsed: number;
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
  quotaType: 'CAP' | 'COUNT';
  usageAvailable: number | null;
  usageUsed: number;
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
  quotaType,
  usageAvailable,
  usageUsed,
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

  const baseNonAnyOptions =
    sameTypeBenefitOptions.length > 0
      ? sameTypeBenefitOptions
      : [
          {
            benefitName,
            cashbackType,
            cashbackAmount,
            quotaType,
            usageAvailable,
            usageUsed,
            minimumSpending,
            maximumSpending,
            purchaseChannel: defaultChannel ?? null,
            cardOptions,
          },
        ];

  const sourceOptions = isAnyBenefit ? anyBenefitOptions : [...baseNonAnyOptions, ...anyBenefitOptions];

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

      const quotaRemaining =
        option.usageAvailable === null ? null : Math.max(0, option.usageAvailable - option.usageUsed);

      const eligible =
        matchesChannel(option.purchaseChannel) && matchesSpend(option.minimumSpending, option.maximumSpending);

      const quotaAdjustedEarn =
        option.quotaType === 'COUNT'
          ? quotaRemaining !== null && quotaRemaining <= 0
            ? 0
            : earnAmount
          : quotaRemaining === null
            ? earnAmount
            : Math.min(earnAmount, quotaRemaining);

      const eligibleWithQuota =
        eligible &&
        (option.quotaType === 'COUNT'
          ? quotaRemaining === null || quotaRemaining > 0
          : quotaRemaining === null || quotaRemaining > 0);

      return {
        id: `${option.benefitName}-${card.name}-${option.cashbackAmount}-${option.purchaseChannel ?? 'ANY'}`,
        benefitName: option.benefitName,
        cashbackType: option.cashbackType,
        cashbackAmount: option.cashbackAmount,
        minimumSpending: option.minimumSpending,
        maximumSpending: option.maximumSpending,
        purchaseChannel: option.purchaseChannel,
        rangeLabel: formatSpendRange(option.minimumSpending, option.maximumSpending),
        cardName: card.name,
        isCredit: card.isCredit,
        effectiveRate,
        earnAmount: quotaAdjustedEarn,
        eligible: eligibleWithQuota,
      };
    }),
  );

  const cumulativeCandidates = allCandidates.map((candidate) => {
    const minOnlyAccumulated = allCandidates
      .filter(
        (other) =>
          other.eligible &&
          other.cardName === candidate.cardName &&
          other.minimumSpending !== null &&
          other.maximumSpending === null,
      )
      .reduce((sum, current) => sum + current.earnAmount, 0);

    const shouldAccumulate = candidate.minimumSpending !== null && candidate.maximumSpending === null;
    return {
      ...candidate,
      earnAmount: shouldAccumulate ? minOnlyAccumulated : candidate.earnAmount,
    };
  });

  const activeCandidates = cumulativeCandidates.filter((candidate) => candidate.eligible);

  const selectedOrDefaultChannel: PurchaseChannel | null = defaultChannel ?? (purchaseChannel || null);

  const chartData = useMemo(() => {
    const getEstimatedCashbackAtAmount = (simulatedAmount: number) => {
      const simulatedCandidates = sourceOptions.flatMap((option) =>
        option.cardOptions.map((card) => {
          const effectiveRate =
            option.cashbackType === 'PERCENTAGE'
              ? Math.max(0, option.cashbackAmount - (purchaseChannel === 'FOREIGN_CURRENCY' ? (card.fcyFee ?? 0) : 0))
              : option.cashbackAmount;

          const earnAmount =
            option.cashbackType === 'PERCENTAGE' ? (simulatedAmount * effectiveRate) / 100 : option.cashbackAmount;

          const quotaRemaining =
            option.usageAvailable === null ? null : Math.max(0, option.usageAvailable - option.usageUsed);

          const passMin = option.minimumSpending === null || simulatedAmount >= option.minimumSpending;
          const passMax = option.maximumSpending === null || simulatedAmount <= option.maximumSpending;
          const passSpend = passMin && passMax;
          const passChannel = matchesChannel(option.purchaseChannel);

          const quotaAdjustedEarn =
            option.quotaType === 'COUNT'
              ? quotaRemaining !== null && quotaRemaining <= 0
                ? 0
                : earnAmount
              : quotaRemaining === null
                ? earnAmount
                : Math.min(earnAmount, quotaRemaining);

          const eligibleWithQuota =
            passSpend &&
            passChannel &&
            (option.quotaType === 'COUNT'
              ? quotaRemaining === null || quotaRemaining > 0
              : quotaRemaining === null || quotaRemaining > 0);

          return {
            cardName: card.name,
            minimumSpending: option.minimumSpending,
            maximumSpending: option.maximumSpending,
            earnAmount: quotaAdjustedEarn,
            eligible: eligibleWithQuota,
          };
        }),
      );

      const simulatedCumulative = simulatedCandidates.map((candidate) => {
        const minOnlyAccumulated = simulatedCandidates
          .filter(
            (other) =>
              other.eligible &&
              other.cardName === candidate.cardName &&
              other.minimumSpending !== null &&
              other.maximumSpending === null,
          )
          .reduce((sum, current) => sum + current.earnAmount, 0);

        const shouldAccumulate = candidate.minimumSpending !== null && candidate.maximumSpending === null;
        return {
          ...candidate,
          earnAmount: shouldAccumulate ? minOnlyAccumulated : candidate.earnAmount,
        };
      });

      const simulatedActive = simulatedCumulative.filter((candidate) => candidate.eligible);
      const bestSimulated = simulatedActive.reduce<(typeof simulatedActive)[number] | null>((best, candidate) => {
        if (!best) return candidate;
        return candidate.earnAmount > best.earnAmount ? candidate : best;
      }, null);

      return {
        totalCashback: bestSimulated?.earnAmount ?? 0,
        bestCardName: bestSimulated?.cardName ?? 'No eligible card',
      };
    };

    const currentAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

    const highestConfiguredAmount = sourceOptions.reduce((max, option) => {
      const optionMax = option.maximumSpending ?? option.minimumSpending ?? 0;
      return Math.max(max, optionMax);
    }, 0);

    const hasOpenEndedTier = sourceOptions.some(
      (option) => option.minimumSpending !== null && option.maximumSpending === null,
    );

    const anyDynamicUpperBound = Math.max(currentAmount * 1.1, highestConfiguredAmount * 1.1, 10000);
    const nonAnyUpperBound = hasOpenEndedTier
      ? Math.max(currentAmount * 1.1, highestConfiguredAmount * 1.5, 5000)
      : Math.max(currentAmount * 1.1, highestConfiguredAmount * 1.1, 1000);

    const upperBound = isAnyBenefit ? anyDynamicUpperBound : nonAnyUpperBound;
    const roundedUpperBound = Math.max(100, Math.ceil(upperBound / 100) * 100);
    const stepCount = isAnyBenefit ? 240 : 80;
    const generated = new Map<number, number>();

    const breakpointValues = sourceOptions.flatMap((option) => {
      const points: number[] = [];
      if (option.minimumSpending !== null) {
        const min = Math.max(1, Math.round(option.minimumSpending));
        points.push(min);
        if (min > 1) points.push(min - 1);
      }
      if (option.maximumSpending !== null) {
        const max = Math.max(1, Math.round(option.maximumSpending));
        points.push(max);
        points.push(max + 1);
      }
      return points;
    });

    for (let i = 1; i <= stepCount; i += 1) {
      const x = Math.max(1, Math.round((roundedUpperBound * i) / stepCount));
      generated.set(x, x);
    }

    generated.set(1, 1);

    breakpointValues.forEach((point) => {
      if (point <= roundedUpperBound) {
        generated.set(point, point);
      }
    });

    return Array.from(generated.values())
      .map((amountValue) => {
        const estimate = getEstimatedCashbackAtAmount(amountValue);
        return {
          amount: amountValue,
          totalCashback: estimate.totalCashback,
          bestCardName: estimate.bestCardName,
        };
      })
      .sort((left, right) => left.amount - right.amount);
  }, [amount, isAnyBenefit, purchaseChannel, sourceOptions]);

  const chartMaxAmount = chartData[chartData.length - 1]?.amount ?? 1;
  const redLineAmount = hasValidAmount ? Math.min(amount, chartMaxAmount) : null;

  const xAxisTicks = useMemo(() => {
    const maxAmount = chartData[chartData.length - 1]?.amount ?? 1;
    const interval = Math.max(1, Math.round(maxAmount / 4));
    const ticks = new Set<number>([1]);

    for (let value = interval; value <= maxAmount; value += interval) {
      ticks.add(value);
    }

    ticks.add(maxAmount);
    return Array.from(ticks).sort((left, right) => left - right);
  }, [chartData]);

  const bestAnyCandidate = activeCandidates.reduce<(typeof activeCandidates)[number] | null>((best, candidate) => {
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
          isCredit: bestAnyCandidate.isCredit,
          benefitName: bestAnyCandidate.benefitName,
        }
      : null
    : null;

  const includedAccumulatedRowIds = new Set<string>();
  if (effectiveBest) {
    const cumulativeContributors = cumulativeCandidates.filter(
      (candidate) =>
        candidate.eligible &&
        candidate.cardName === effectiveBest.cardName &&
        candidate.minimumSpending !== null &&
        candidate.maximumSpending === null,
    );

    if (hasValidAmount && cumulativeContributors.length > 0) {
      cumulativeContributors.forEach((candidate) => includedAccumulatedRowIds.add(candidate.id));
    } else if (hasValidAmount) {
      includedAccumulatedRowIds.add(effectiveBest.id);
    }
  }

  const youEarns = hasValidAmount && effectiveBest ? effectiveBest.earns : 0;

  const totalNeedToPay = hasValidAmount ? amount - youEarns : 0;
  const savingsPct = hasValidAmount && amount > 0 ? (youEarns / amount) * 100 : 0;
  const jkEarnsCashflow = hasValidAmount ? Math.max(0, totalNeedToPay) : 0;

  const jkEarnDisplay =
    effectiveBest && !effectiveBest.isCredit ? 'nothing' : `${formatMoney(jkEarnsCashflow)} in cashflow`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPurchaseChannel(defaultChannel ?? '');
          setOpen(true);
        }}
        className={
          compact
            ? 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
            : 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
        }
      >
        Adopt
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
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
              <input type="hidden" name="estimatedCashback" value={Math.max(0, Math.round(youEarns)).toString()} />
              <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Benefit: <span className="font-medium">{benefitName}</span>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-600">
                  Spendings
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

              <div className="mb-3 rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-2 text-sm font-medium text-slate-700">Estimated Savings</div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200" />
                      <XAxis
                        dataKey="amount"
                        type="number"
                        stroke="var(--color-slate-300)"
                        axisLine={{ stroke: 'var(--color-slate-300)' }}
                        tickLine={{ stroke: 'var(--color-slate-400)' }}
                        tick={{ fill: 'var(--color-slate-600)', fontSize: 11 }}
                        tickFormatter={(value) => {
                          const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                          return `$${Math.round(Number.isFinite(numericValue) ? numericValue : 0)}`;
                        }}
                        domain={[0, 'dataMax']}
                        ticks={xAxisTicks}
                        allowDataOverflow
                        height={36}
                        label={{
                          value: 'Spendings',
                          position: 'insideBottom',
                          offset: 2,
                          fill: 'var(--color-slate-700)',
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        stroke="var(--color-slate-300)"
                        axisLine={{ stroke: 'var(--color-slate-300)' }}
                        tickLine={{ stroke: 'var(--color-slate-400)' }}
                        tick={{ fill: 'var(--color-slate-600)', fontSize: 11 }}
                        tickFormatter={(value) => {
                          const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                          return `$${(Number.isFinite(numericValue) ? numericValue : 0).toFixed(0)}`;
                        }}
                        width={64}
                        label={{
                          value: 'Savings',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 10,
                          fill: 'var(--color-slate-700)',
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const primary = payload.find((entry) => entry.dataKey === 'totalCashback') ?? payload[0];
                          const point = primary?.payload as
                            | { amount?: number; totalCashback?: number; bestCardName?: string }
                            | undefined;
                          const labelAsNumber = typeof label === 'number' ? label : Number(label ?? 0);
                          const amountValue = Number.isFinite(point?.amount)
                            ? Number(point?.amount)
                            : Number.isFinite(labelAsNumber)
                              ? labelAsNumber
                              : 0;
                          const rawCashback =
                            typeof primary?.value === 'number'
                              ? primary.value
                              : Number(primary?.value ?? point?.totalCashback ?? 0);
                          const cashbackValue = Number.isFinite(rawCashback) ? rawCashback : 0;
                          const bestCardName = point?.bestCardName ?? 'No eligible card';
                          const savingsPct = amountValue > 0 ? (cashbackValue / amountValue) * 100 : 0;

                          return (
                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                              <div className="font-semibold text-slate-800">
                                Savings: {formatMoney(cashbackValue)} ({savingsPct.toFixed(1)}%)
                              </div>
                              <div className="text-slate-600">Spendings: ${Math.round(amountValue)}</div>
                              <div className="text-slate-500">with {bestCardName}</div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type={isAnyBenefit ? 'stepAfter' : 'linear'}
                        dataKey="totalCashback"
                        name="Total cashback"
                        stroke="currentColor"
                        className="text-slate-700"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      {redLineAmount !== null && (
                        <ReferenceLine
                          x={redLineAmount}
                          stroke="currentColor"
                          className="text-red-600"
                          strokeWidth={2}
                          ifOverflow="extendDomain"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
                          <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-medium">
                            {effectiveBest.rangeLabel}
                          </td>
                          <td className="px-5 py-3 text-slate-600 truncate max-w-[180px]">{effectiveBest.cardName}</td>
                          <td
                            className={`px-5 py-3 whitespace-nowrap font-bold text-right ${effectiveBest.cashbackColorClass}`}
                          >
                            {effectiveBest.cashbackText}
                          </td>
                        </tr>
                      ) : (
                        cumulativeCandidates
                          .filter((candidate) => {
                            if (candidate.rangeLabel !== 'Any Spending') return true;
                            const isIncluded = includedAccumulatedRowIds.has(candidate.id);
                            return candidate.eligible && isIncluded;
                          })
                          .map((candidate) => {
                            const isIncluded = includedAccumulatedRowIds.has(candidate.id);
                            return (
                              <tr key={candidate.id} className={isIncluded ? 'bg-white' : 'bg-slate-100'}>
                                <td className="px-5 py-3 whitespace-nowrap text-slate-600 font-medium">
                                  {candidate.rangeLabel}
                                </td>
                                <td className="px-5 py-3 text-slate-700 truncate max-w-[180px]">
                                  {candidate.cardName}
                                </td>
                                <td
                                  className={`px-5 py-3 whitespace-nowrap font-bold text-right ${cashbackColorClass(candidate.purchaseChannel ?? selectedOrDefaultChannel)}`}
                                >
                                  {candidate.cashbackType === 'PERCENTAGE'
                                    ? formatRate(candidate.effectiveRate)
                                    : formatMoney(candidate.cashbackAmount)}
                                </td>
                              </tr>
                            );
                          })
                      )}
                      {false && !effectiveBest && (
                        <tr>
                          <td className="px-5 py-3 text-slate-500" colSpan={3}>
                            No eligible cards found
                          </td>
                        </tr>
                      )}
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
                      <span className="ml-2 text-sm font-medium text-emerald-600">
                        ({savingsPct.toFixed(1)}% savings)
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md px-5 py-2">
                    <div className="font-semibold text-slate-500">jk earns (Est.)</div>
                    <div className="text-base font-semibold text-slate-700">{jkEarnDisplay}</div>
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
