import type { Prisma } from '@prisma/client';
import type { ComponentType } from 'react';

export type CashbackType = 'PERCENTAGE' | 'ONE_TIME_CASH';
export type PurchaseChannel = 'ONLINE_PURCHASE' | 'OFFLINE_PURCHASE' | 'FOREIGN_CURRENCY';
export type QuotaType = 'CAP' | 'COUNT';
export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const PURCHASE_CHANNELS: PurchaseChannel[] = ['ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY'];
export const WEEKDAY_OPTIONS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];
export const CHANNEL_OPTIONS: PurchaseChannel[] = ['ONLINE_PURCHASE', 'OFFLINE_PURCHASE', 'FOREIGN_CURRENCY'];

export type Card = {
  id: string;
  name: string;
  fcyFee: number | null;
  isCredit: boolean;
  isDisabled: boolean;
};

export type CardOption = Pick<Card, 'name' | 'fcyFee' | 'isCredit'>;

export type Friend = {
  id: string;
  email: string;
  nickname: string;
  fcmToken: string;
  activeUntil: string;
  isDisabled: boolean;
};

export type BenefitCardLink = {
  cardId: string;
  card: Pick<Card, 'id' | 'name' | 'fcyFee' | 'isCredit'>;
};

export type Benefit = {
  id: string;
  categoryName: string;
  expiryDate: Date | null;
  cashbackType: CashbackType;
  cashbackAmount: number;
  quotaType: QuotaType;
  usageAvailable: number | null;
  usageUsed: number;
  quotaResetsMonthly: boolean;
  minimumSpending: number | null;
  maximumSpending: number | null;
  applicableWeekdays: Weekday[];
  purchaseChannel: PurchaseChannel | null;
  cardLinks: BenefitCardLink[];
};

export type BenefitForm = {
  id: string;
  categoryName: string;
  expiryDate: string;
  cashbackType: CashbackType;
  cashbackAmount: string;
  quotaType: QuotaType;
  usageAvailable: string;
  usageUsed?: number;
  quotaResetsMonthly: boolean;
  minimumSpending: string;
  maximumSpending: string;
  applicableWeekdays: Weekday[];
  purchaseChannel: PurchaseChannel | '';
  linkedCardIds: string[];
};

export type ChannelGroupOption = Benefit & {
  effectiveCashback: number;
  cardName: string;
};

export type AnyBenefitOption = {
  benefitName: string;
  cashbackType: CashbackType;
  cashbackAmount: number;
  quotaType: QuotaType;
  usageAvailable: number | null;
  usageUsed: number;
  minimumSpending: number | null;
  maximumSpending: number | null;
  purchaseChannel: PurchaseChannel | null;
  cardOptions: CardOption[];
};

export type BenefitTypeOption = AnyBenefitOption;

export type AdoptButtonProps = {
  benefitId: string;
  benefitName: string;
  cashbackType: CashbackType;
  cashbackAmount: number;
  quotaType: QuotaType;
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

export type ManageGridProps = {
  friends: Friend[];
  cards: Array<{
    id: string;
    name: string;
    fcyFee: string;
    isCredit: boolean;
    isDisabled: boolean;
  }>;
  benefits: BenefitForm[];
  weekdayOptions: Weekday[];
  channelOptions: PurchaseChannel[];
  serverVariables: Array<{ key: string; value: string; readOnly: boolean }>;
};

export type Row<T> = T & { _key: string };

export type ChannelCardConfig = {
  channel: PurchaseChannel;
  label: string;
  colorClass: string;
  Icon: ComponentType<{ className?: string }>;
};

export const CHANNEL_SERIES_META: Record<
  PurchaseChannel,
  {
    dataKey: 'onlineCashback' | 'offlineCashback' | 'foreignCashback';
    cardKey: 'onlineBestCardName' | 'offlineBestCardName' | 'foreignBestCardName';
    label: string;
    color: string;
  }
> = {
  ONLINE_PURCHASE: {
    dataKey: 'onlineCashback',
    cardKey: 'onlineBestCardName',
    label: 'Online',
    color: 'var(--color-blue-600)',
  },
  OFFLINE_PURCHASE: {
    dataKey: 'offlineCashback',
    cardKey: 'offlineBestCardName',
    label: 'Offline',
    color: 'var(--color-emerald-600)',
  },
  FOREIGN_CURRENCY: {
    dataKey: 'foreignCashback',
    cardKey: 'foreignBestCardName',
    label: 'Foreign Currency',
    color: 'var(--color-purple-600)',
  },
};

export const DATA_KEY_TO_CHANNEL: Record<'onlineCashback' | 'offlineCashback' | 'foreignCashback', PurchaseChannel> = {
  onlineCashback: 'ONLINE_PURCHASE',
  offlineCashback: 'OFFLINE_PURCHASE',
  foreignCashback: 'FOREIGN_CURRENCY',
};

export const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export const formatRate = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, '')}%`;

export const formatSpendRange = (minimumSpending: number | null, maximumSpending: number | null) => {
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

export const cashbackColorClass = (channel: PurchaseChannel | null) => {
  if (channel === 'ONLINE_PURCHASE') return 'text-blue-600';
  if (channel === 'OFFLINE_PURCHASE') return 'text-emerald-600';
  if (channel === 'FOREIGN_CURRENCY') return 'text-purple-600';
  return 'text-indigo-600';
};

export type ServerVariableCard = {
  key: string;
  value: string;
  readOnly: boolean;
};

export type FriendAccessManageRow = Prisma.FriendAccessGetPayload<{
  include: { friend: { select: { email: true } } };
}>;

export type CardManageRow = Prisma.CardGetPayload<Record<string, never>>;

export type BenefitManageRow = Prisma.BenefitGetPayload<{
  include: {
    cardLinks: {
      include: { card: { select: { name: true } } };
    };
  };
}>;

export type BenefitRequestHistoryRow = Prisma.BenefitRequestGetPayload<{
  include: { benefit: { select: { categoryName: true } } };
}>;
