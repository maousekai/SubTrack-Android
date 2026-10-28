import React from 'react';
import {
  CalendarClock,
  CreditCard,
  Layers,
  ArrowUpRight,
  Target,
} from 'lucide-react';
import { CurrencyCode, Subscription } from '../types/subtrack';
import {
  calculateBudgetStatus,
  formatCurrency,
  formatDisplayDate,
  getDaysUntilBilling,
} from '../utils/subtrackLogic';

interface OverviewCardsProps {
  estimatedMonthlyCost: number;
  activeCount: number;
  totalCount: number;
  dueIn7DaysCount: number;
  dueIn7DaysList: Subscription[];
  otherCurrencyActiveCount: number;
  defaultCurrency: CurrencyCode;
  monthlyBudget: number;
  autoConvertCurrency: boolean;
  todayIso: string;
  onSelectSubscription: (sub: Subscription) => void;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  estimatedMonthlyCost,
  activeCount,
  totalCount,
  dueIn7DaysCount,
  dueIn7DaysList,
  otherCurrencyActiveCount,
  defaultCurrency,
  monthlyBudget,
  autoConvertCurrency,
  todayIso,
  onSelectSubscription,
}) => {
  const budget = calculateBudgetStatus(estimatedMonthlyCost, monthlyBudget);

  return (
    <section aria-label="Tổng quan chi phí" className="space-y-3">
      {/* Main Hero Overview Card (Android Material 3 Elevated Surface) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-300">
              Chi phí tháng ước tính ({defaultCurrency})
            </div>
            <div
              data-testid="overview-monthly-cost"
              className="text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums mt-1"
            >
              {formatCurrency(estimatedMonthlyCost, defaultCurrency)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {otherCurrencyActiveCount > 0 && !autoConvertCurrency
                ? `Chưa gồm ${otherCurrencyActiveCount} gói đang hoạt động khác tiền tệ`
                : otherCurrencyActiveCount > 0 && autoConvertCurrency
                  ? `Đã quy đổi gộp ${otherCurrencyActiveCount} gói ngoại tệ theo tỷ giá tham chiếu`
                  : 'Quy đổi từ mọi chu kỳ tuần, tháng, quý, năm'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-blue-300" aria-hidden="true" />
          </div>
        </div>

        {/* 2 Compact Android Sub-Metrics Row */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Đang hoạt động</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </div>
            <div
              data-testid="overview-active-count"
              className="text-lg font-bold font-mono tabular-nums mt-1"
            >
              {activeCount}
              <span className="text-xs font-normal text-slate-400 ml-1">
                / {totalCount} gói
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Đến hạn ≤ 7 ngày</span>
              <CalendarClock
                className={`w-3.5 h-3.5 ${
                  dueIn7DaysCount > 0 ? 'text-amber-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
            </div>
            <div
              data-testid="overview-due-count"
              className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                dueIn7DaysCount > 0 ? 'text-amber-300' : 'text-white'
              }`}
            >
              {dueIn7DaysCount}
              <span className="text-xs font-normal text-slate-400 ml-1">gói</span>
            </div>
          </div>
        </div>

        {/* Suggested Feature: Hạn mức ngân sách hàng tháng */}
        {budget.isEnabled && (
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Target className="w-3.5 h-3.5 text-blue-300" aria-hidden="true" />
                <span>
                  Hạn mức ngân sách: {formatCurrency(monthlyBudget, defaultCurrency)}
                </span>
              </span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  budget.status === 'exceeded'
                    ? 'text-red-300'
                    : budget.status === 'warning'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                }`}
              >
                {budget.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budget.status === 'exceeded'
                    ? 'bg-red-400'
                    : budget.status === 'warning'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-300">
              {budget.status === 'exceeded'
                ? `Cảnh báo: Vượt hạn mức ngân sách tháng ${formatCurrency(Math.abs(budget.remaining), defaultCurrency)}!`
                : `Còn dư ${formatCurrency(budget.remaining, defaultCurrency)} trong hạn mức tháng này.`}
            </p>
          </div>
        )}
      </div>

      {/* Upcoming within 7 days quick strip */}
      {dueIn7DaysList.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 space-y-2">
          <div className="text-xs text-amber-950">
            <span className="font-bold">Sắp đến hạn thanh toán: </span>
            <span>
              Có {dueIn7DaysList.length} gói đang hoạt động đến kỳ thu phí trong 7 ngày tới.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dueIn7DaysList.map((sub) => {
              const days = getDaysUntilBilling(sub.nextBillingDate, todayIso);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubscription(sub)}
                  className="max-w-full inline-flex items-center gap-1.5 text-xs font-medium text-amber-950 bg-white border border-amber-200 hover:border-amber-400 rounded-xl px-2.5 py-1.5 transition-colors overflow-hidden"
                >
                  <span className="truncate">{sub.name}</span>
                  <span aria-hidden="true" className="text-amber-400 shrink-0">·</span>
                  <span className="font-mono tabular-nums text-amber-700 shrink-0">
                    {days === 0 ? 'Hôm nay' : `Còn ${days} ngày (${formatDisplayDate(sub.nextBillingDate)})`}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
