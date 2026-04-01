import type { CashbackType, PurchaseChannel, QuotaType, RequestStatus, Weekday } from '@/app/types';

export type ApiBenefitCard = {
  id: string;
  name: string;
  fcyFee: number | null;
  isCredit: boolean;
};

export type ApiBenefitCardLink = {
  cardId: string;
  card: ApiBenefitCard;
};

export type ApiBenefit = {
  id: string;
  categoryName: string;
  expiryDate: string | null;
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
  cardLinks: ApiBenefitCardLink[];
};

export type ApiBrowseResponse = {
  benefits: ApiBenefit[];
};

export type ApiHistoryItem = {
  id: string;
  createdAt: string;
  benefitId: string;
  benefitName: string;
  amountSpent: number;
  purchaseChannel: PurchaseChannel;
  status: RequestStatus;
};

export type ApiHistoryResponse = {
  requests: ApiHistoryItem[];
};

export type ApiManageFriend = {
  id: string;
  email: string;
  nickname: string;
  fcmToken: string;
  activeUntil: string;
  isDisabled: boolean;
};

export type ApiManageCard = {
  id: string;
  name: string;
  fcyFee: string;
  isCredit: boolean;
  isDisabled: boolean;
};

export type ApiManageBenefit = {
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

export type ApiServerVariable = {
  key: string;
  value: string;
  readOnly: boolean;
};

export type ApiManageResponse = {
  friends: ApiManageFriend[];
  cards: ApiManageCard[];
  benefits: ApiManageBenefit[];
  weekdayOptions: Weekday[];
  channelOptions: PurchaseChannel[];
  serverVariables: ApiServerVariable[];
};

export type ApiSessionResponse = {
  user: {
    id: string;
    email: string;
    name: string;
  };
};
