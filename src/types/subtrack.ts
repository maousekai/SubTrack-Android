export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export type CurrencyCode = 'VND' | 'USD' | 'EUR' | 'JPY' | 'GBP';

export type ReminderLeadDays = -1 | 0 | 1 | 3 | 7 | 30;

export type SortOption = 'date' | 'cost' | 'name';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  cycle: BillingCycle;
  nextBillingDate: string; // YYYY-MM-DD
  category: string;
  status: SubscriptionStatus;
  reminderDays: ReminderLeadDays; // -1 = Off, 0 = Same day, 1, 3, 7, 30
  tagIds: string[];
  platform: string;
  managementUrl: string;
  notes: string;
  lastNotifiedCycleDate?: string; // Tracks UC14: only notify once per billing cycle
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  defaultCurrency: CurrencyCode;
  remindersEnabled: boolean;
  hasCompletedOnboarding: boolean;
  monthlyBudget: number; // Suggested feature: Hạn mức ngân sách tháng (0 = tắt)
  autoConvertCurrency: boolean; // Suggested feature: Quy đổi tỷ giá ngoại tệ tự động
  cloudAutoSync: boolean; // UC15: Tự động đồng bộ Firebase Firestore
}

export interface NotificationItem {
  id: string;
  subscriptionId?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  isTest?: boolean;
}

export interface ValidationErrors {
  name?: string;
  amount?: string;
  nextBillingDate?: string;
  managementUrl?: string;
}

export interface PieSlice {
  id: string;
  label: string;
  monthlyAmount: number;
  percentage: number;
  color: string;
  isOther?: boolean;
}

export interface CategoryCostItem {
  category: string;
  monthlyAmount: number;
  percentage: number;
  count: number;
}

export interface ReportSummary {
  currency: CurrencyCode;
  weeklyTotal: number;
  monthlyTotal: number;
  quarterlyTotal: number;
  yearlyTotal: number;
  activeMatchingCount: number;
  excludedCurrencyCount: number;
  convertedCurrencyCount: number;
  pieSlices: PieSlice[];
  categoryBreakdown: CategoryCostItem[];
  topExpensive: Array<{
    subscription: Subscription;
    monthlyAmount: number;
  }>;
}
