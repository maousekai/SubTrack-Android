import {
  BillingCycle,
  CategoryCostItem,
  CurrencyCode,
  PieSlice,
  ReminderLeadDays,
  ReportSummary,
  SortOption,
  Subscription,
  SubscriptionStatus,
  Tag,
  ValidationErrors,
} from '../types/subtrack';

export const CATEGORIES: string[] = [
  'Giải trí',
  'Công việc & Năng suất',
  'Lưu trữ đám mây',
  'Âm nhạc & Podcast',
  'Học tập',
  'Thiết kế & Sáng tạo',
  'Tiện ích hệ thống',
  'Sức khỏe & Thể thao',
  'Khác',
];

export const PLATFORMS: string[] = [
  'Google Play (Android)',
  'Web',
  'App Store (iOS)',
  'Desktop (macOS/Windows)',
  'Smart TV',
  'Đa nền tảng',
];

export const CURRENCIES: Array<{ code: CurrencyCode; label: string; symbol: string }> = [
  { code: 'VND', label: 'VND (₫)', symbol: '₫' },
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
];

// Reference rates in VND for optional multi-currency conversion
export const RATE_TO_VND: Record<CurrencyCode, number> = {
  VND: 1,
  USD: 25400,
  EUR: 27500,
  JPY: 168,
  GBP: 32200,
};

export function convertCurrencyAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;
  const inVnd = amount * RATE_TO_VND[from];
  return inVnd / RATE_TO_VND[to];
}

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Đang hoạt động',
  paused: 'Tạm dừng',
  cancelled: 'Đã hủy',
};

export const REMINDER_OPTIONS: Array<{ value: ReminderLeadDays; label: string }> = [
  { value: 0, label: 'Nhắc đúng ngày thanh toán' },
  { value: 1, label: 'Trước 1 ngày' },
  { value: 3, label: 'Trước 3 ngày (Mặc định)' },
  { value: 7, label: 'Trước 7 ngày' },
  { value: 30, label: 'Trước 30 ngày' },
  { value: -1, label: 'Không nhắc hạn' },
];

export const TAG_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Xanh biển', hex: '#2563EB' },
  { name: 'Xanh ngọc', hex: '#0D9488' },
  { name: 'Xanh lá', hex: '#16A34A' },
  { name: 'Hổ phách', hex: '#D97706' },
  { name: 'Đỏ cam', hex: '#EA580C' },
  { name: 'Đỏ thẫm', hex: '#DC2626' },
  { name: 'Tím chàm', hex: '#4F46E5' },
  { name: 'Hồng đậm', hex: '#DB2777' },
  { name: 'Xám đá', hex: '#475569' },
];

export const CHART_PALETTE: string[] = [
  '#0F172A',
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#4F46E5',
  '#DC2626',
  '#94A3B8', // Used for "Các gói khác"
];

export const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-personal', name: 'Cá nhân', color: '#2563EB' },
  { id: 'tag-family', name: 'Gia đình', color: '#16A34A' },
  { id: 'tag-work', name: 'Công việc', color: '#4F46E5' },
  { id: 'tag-essential', name: 'Thiết yếu', color: '#D97706' },
  { id: 'tag-entertainment', name: 'Giải trí tại nhà', color: '#DB2777' },
];

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function getSuggestedNextMonthDate(referenceIsoDate?: string): string {
  const base = referenceIsoDate ? parseLocalDate(referenceIsoDate) : new Date();
  const next = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
  return formatDateISO(next);
}

export function addOneCycle(isoDate: string, cycle: BillingCycle): string {
  const d = parseLocalDate(isoDate);
  if (cycle === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (cycle === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (cycle === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return formatDateISO(d);
}

export function advancePastBillingDate(
  nextBillingDate: string,
  cycle: BillingCycle,
  todayIso: string
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextBillingDate)) return nextBillingDate;
  let current = nextBillingDate;
  let guard = 0;
  while (current < todayIso && guard < 500) {
    current = addOneCycle(current, cycle);
    guard++;
  }
  return current;
}

export function getDaysUntilBilling(targetIso: string, todayIso: string): number {
  const target = parseLocalDate(targetIso);
  const today = parseLocalDate(todayIso);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function toMonthlyCost(amount: number, cycle: BillingCycle): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  switch (cycle) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
  }
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (currency === 'VND' || currency === 'JPY') {
    const rounded = Math.round(safeAmount);
    const symbol = currency === 'VND' ? '₫' : '¥';
    return `${rounded.toLocaleString('vi-VN')} ${symbol}`;
  }
  const symbolMap: Record<CurrencyCode, string> = {
    VND: '₫',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    GBP: '£',
  };
  return `${symbolMap[currency]}${safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function validateSubscriptionInput(input: {
  name: string;
  amountInput: string;
  nextBillingDate: string;
  managementUrl: string;
}): { isValid: boolean; errors: ValidationErrors; parsedAmount: number } {
  const errors: ValidationErrors = {};
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    errors.name = 'Tên gói đăng ký là bắt buộc.';
  } else if (trimmedName.length > 60) {
    errors.name = 'Tên gói đăng ký không được vượt quá 60 ký tự.';
  }

  const rawAmount = input.amountInput.trim();
  const parsedAmount = rawAmount === '' ? NaN : Number(rawAmount);
  if (rawAmount === '' || Number.isNaN(parsedAmount)) {
    errors.amount = 'Vui lòng nhập số tiền hợp lệ.';
  } else if (parsedAmount < 0) {
    errors.amount = 'Số tiền không được âm.';
  }

  if (!input.nextBillingDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.nextBillingDate)) {
    errors.nextBillingDate = 'Vui lòng chọn ngày thanh toán hợp lệ.';
  }

  const trimmedUrl = input.managementUrl.trim();
  if (trimmedUrl.length > 0) {
    const isHttpUrl = /^https?:\/\/.+/i.test(trimmedUrl);
    if (!isHttpUrl) {
      errors.managementUrl = 'Liên kết quản lý phải bắt đầu bằng http:// hoặc https://.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    parsedAmount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
  };
}

export function calculateOverview(
  subscriptions: Subscription[],
  defaultCurrency: CurrencyCode,
  todayIso: string,
  autoConvertCurrency: boolean = false
): {
  estimatedMonthlyCost: number;
  activeCount: number;
  dueIn7DaysCount: number;
  dueIn7DaysList: Subscription[];
  otherCurrencyActiveCount: number;
} {
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const matchingCurrencySubs = activeSubs.filter((s) => s.currency === defaultCurrency);
  const otherCurrencyActiveCount = activeSubs.length - matchingCurrencySubs.length;

  const estimatedMonthlyCost = (autoConvertCurrency ? activeSubs : matchingCurrencySubs).reduce(
    (sum, s) => {
      const convertedAmount = autoConvertCurrency
        ? convertCurrencyAmount(s.amount, s.currency, defaultCurrency)
        : s.amount;
      return sum + toMonthlyCost(convertedAmount, s.cycle);
    },
    0
  );

  const dueIn7DaysList = activeSubs
    .filter((s) => {
      const days = getDaysUntilBilling(s.nextBillingDate, todayIso);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));

  return {
    estimatedMonthlyCost,
    activeCount: activeSubs.length,
    dueIn7DaysCount: dueIn7DaysList.length,
    dueIn7DaysList,
    otherCurrencyActiveCount,
  };
}

export function calculateBudgetStatus(
  monthlyCost: number,
  monthlyBudget: number
): {
  isEnabled: boolean;
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'exceeded';
} {
  if (!monthlyBudget || monthlyBudget <= 0) {
    return { isEnabled: false, percentage: 0, remaining: 0, status: 'safe' };
  }
  const percentage = (monthlyCost / monthlyBudget) * 100;
  const remaining = monthlyBudget - monthlyCost;
  const status =
    percentage > 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'safe';
  return { isEnabled: true, percentage, remaining, status };
}

export function filterAndSortSubscriptions(
  subscriptions: Subscription[],
  tags: Tag[],
  options: {
    searchQuery: string;
    statusFilter: SubscriptionStatus | 'all';
    categoryFilter: string | 'all';
    tagFilter?: string | 'all';
    sortBy: SortOption;
  }
): Subscription[] {
  const tagMap = new Map<string, string>();
  for (const t of tags) {
    tagMap.set(t.id, t.name.toLowerCase());
  }

  const query = options.searchQuery.trim().toLowerCase();

  const filtered = subscriptions.filter((sub) => {
    if (options.statusFilter !== 'all' && sub.status !== options.statusFilter) {
      return false;
    }
    if (options.categoryFilter !== 'all' && sub.category !== options.categoryFilter) {
      return false;
    }
    if (options.tagFilter && options.tagFilter !== 'all') {
      if (!sub.tagIds.includes(options.tagFilter)) {
        return false;
      }
    }
    if (query) {
      const matchesName = sub.name.toLowerCase().includes(query);
      const matchesPlatform = sub.platform.toLowerCase().includes(query);
      const matchesCategory = sub.category.toLowerCase().includes(query);
      const matchesTag = sub.tagIds.some((id) => (tagMap.get(id) || '').includes(query));
      if (!matchesName && !matchesPlatform && !matchesCategory && !matchesTag) {
        return false;
      }
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'date') {
      return a.nextBillingDate.localeCompare(b.nextBillingDate);
    }
    if (options.sortBy === 'cost') {
      const costDiff = toMonthlyCost(b.amount, b.cycle) - toMonthlyCost(a.amount, a.cycle);
      if (Math.abs(costDiff) > 0.001) return costDiff;
      return a.name.localeCompare(b.name, 'vi');
    }
    return a.name.localeCompare(b.name, 'vi');
  });
}

export function calculateReport(
  subscriptions: Subscription[],
  reportCurrency: CurrencyCode,
  autoConvertCurrency: boolean = false
): ReportSummary {
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const matchingSubs = activeSubs.filter((s) => s.currency === reportCurrency);
  const nonMatchingCount = activeSubs.length - matchingSubs.length;

  const targetSubs = autoConvertCurrency ? activeSubs : matchingSubs;
  const excludedCurrencyCount = autoConvertCurrency ? 0 : nonMatchingCount;
  const convertedCurrencyCount = autoConvertCurrency ? nonMatchingCount : 0;

  const subsWithMonthly = targetSubs
    .map((subscription) => {
      const baseAmount = autoConvertCurrency
        ? convertCurrencyAmount(subscription.amount, subscription.currency, reportCurrency)
        : subscription.amount;
      return {
        subscription,
        monthlyAmount: toMonthlyCost(baseAmount, subscription.cycle),
      };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const monthlyTotal = subsWithMonthly.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const weeklyTotal = (monthlyTotal * 12) / 52;
  const quarterlyTotal = monthlyTotal * 3;
  const yearlyTotal = monthlyTotal * 12;

  const pieSlices: PieSlice[] = [];
  if (monthlyTotal > 0) {
    if (subsWithMonthly.length <= 6) {
      subsWithMonthly.forEach((item, idx) => {
        pieSlices.push({
          id: item.subscription.id,
          label: item.subscription.name,
          monthlyAmount: item.monthlyAmount,
          percentage: (item.monthlyAmount / monthlyTotal) * 100,
          color: CHART_PALETTE[idx % (CHART_PALETTE.length - 1)],
        });
      });
    } else {
      const topSix = subsWithMonthly.slice(0, 6);
      const others = subsWithMonthly.slice(6);
      topSix.forEach((item, idx) => {
        pieSlices.push({
          id: item.subscription.id,
          label: item.subscription.name,
          monthlyAmount: item.monthlyAmount,
          percentage: (item.monthlyAmount / monthlyTotal) * 100,
          color: CHART_PALETTE[idx % 6],
        });
      });
      const otherMonthly = others.reduce((sum, item) => sum + item.monthlyAmount, 0);
      pieSlices.push({
        id: 'other-packages',
        label: `Các gói khác (${others.length})`,
        monthlyAmount: otherMonthly,
        percentage: (otherMonthly / monthlyTotal) * 100,
        color: CHART_PALETTE[6],
        isOther: true,
      });
    }
  }

  const categoryMap = new Map<string, { monthlyAmount: number; count: number }>();
  for (const item of subsWithMonthly) {
    const prev = categoryMap.get(item.subscription.category) || { monthlyAmount: 0, count: 0 };
    categoryMap.set(item.subscription.category, {
      monthlyAmount: prev.monthlyAmount + item.monthlyAmount,
      count: prev.count + 1,
    });
  }

  const categoryBreakdown: CategoryCostItem[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      monthlyAmount: data.monthlyAmount,
      percentage: monthlyTotal > 0 ? (data.monthlyAmount / monthlyTotal) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const topExpensive = subsWithMonthly.slice(0, 3);

  return {
    currency: reportCurrency,
    weeklyTotal,
    monthlyTotal,
    quarterlyTotal,
    yearlyTotal,
    activeMatchingCount: targetSubs.length,
    excludedCurrencyCount,
    convertedCurrencyCount,
    pieSlices,
    categoryBreakdown,
    topExpensive,
  };
}

export function checkDueNotifications(
  subscriptions: Subscription[],
  remindersEnabled: boolean,
  todayIso: string
): {
  dueNotifications: Array<{
    subscriptionId: string;
    title: string;
    message: string;
    nextBillingDate: string;
    daysRemaining: number;
  }>;
  updatedSubscriptions: Subscription[];
} {
  if (!remindersEnabled) {
    return { dueNotifications: [], updatedSubscriptions: subscriptions };
  }

  const dueNotifications: Array<{
    subscriptionId: string;
    title: string;
    message: string;
    nextBillingDate: string;
    daysRemaining: number;
  }> = [];

  const updatedSubscriptions = subscriptions.map((sub) => {
    if (sub.status !== 'active' || sub.reminderDays < 0) {
      return sub;
    }
    const daysRemaining = getDaysUntilBilling(sub.nextBillingDate, todayIso);
    if (daysRemaining >= 0 && daysRemaining <= sub.reminderDays) {
      if (sub.lastNotifiedCycleDate === sub.nextBillingDate) {
        return sub;
      }
      const dayText =
        daysRemaining === 0
          ? 'hôm nay'
          : `trong ${daysRemaining} ngày tới (${formatDisplayDate(sub.nextBillingDate)})`;
      dueNotifications.push({
        subscriptionId: sub.id,
        title: `${sub.name} sắp đến hạn`,
        message: `Gói ${sub.name} (${formatCurrency(sub.amount, sub.currency)}) đến hạn thanh toán ${dayText}.`,
        nextBillingDate: sub.nextBillingDate,
        daysRemaining,
      });
      return {
        ...sub,
        lastNotifiedCycleDate: sub.nextBillingDate,
      };
    }
    return sub;
  });

  return { dueNotifications, updatedSubscriptions };
}

export function generateCsvContent(subscriptions: Subscription[], tags: Tag[]): string {
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));
  const headers = [
    'Tên gói',
    'Số tiền',
    'Tiền tệ',
    'Chu kỳ',
    'Chi phí quy đổi tháng',
    'Ngày thanh toán tiếp theo',
    'Danh mục',
    'Trạng thái',
    'Nền tảng',
    'Tag',
    'Nhắc trước (ngày)',
    'Liên kết quản lý',
    'Ghi chú',
  ];

  const escapeCsvCell = (val: string | number): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = subscriptions.map((sub) => {
    const tagNames = sub.tagIds
      .map((id) => tagMap.get(id))
      .filter(Boolean)
      .join('; ');
    const monthly = Math.round(toMonthlyCost(sub.amount, sub.cycle) * 100) / 100;
    return [
      sub.name,
      sub.amount,
      sub.currency,
      CYCLE_LABELS[sub.cycle],
      monthly,
      sub.nextBillingDate,
      sub.category,
      STATUS_LABELS[sub.status],
      sub.platform,
      tagNames,
      sub.reminderDays < 0 ? 'Tắt' : sub.reminderDays,
      sub.managementUrl,
      sub.notes,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function generateShareReportText(report: ReportSummary): string {
  const lines: string[] = [
    `BÁO CÁO CHI PHÍ ĐĂNG KÝ ĐỊNH KỲ — SUBTRACK (${report.currency})`,
    `--------------------------------------------------`,
    `• Gói đang hoạt động: ${report.activeMatchingCount} gói`,
    `• Chi phí hàng tuần: ${formatCurrency(report.weeklyTotal, report.currency)}`,
    `• Chi phí hàng tháng: ${formatCurrency(report.monthlyTotal, report.currency)}`,
    `• Chi phí hàng quý: ${formatCurrency(report.quarterlyTotal, report.currency)}`,
    `• Chi phí hàng năm: ${formatCurrency(report.yearlyTotal, report.currency)}`,
  ];

  if (report.topExpensive.length > 0) {
    lines.push('', '3 gói tốn kém nhất:');
    report.topExpensive.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.subscription.name}: ${formatCurrency(item.monthlyAmount, report.currency)}/tháng`
      );
    });
  }

  if (report.excludedCurrencyCount > 0) {
    lines.push(
      '',
      `Lưu ý: Có ${report.excludedCurrencyCount} gói đang hoạt động dùng tiền tệ khác không được cộng vào báo cáo này.`
    );
  }

  return lines.join('\n');
}

export function getRRuleByCycle(cycle: BillingCycle): string {
  switch (cycle) {
    case 'weekly':
      return 'RRULE:FREQ=WEEKLY;INTERVAL=1';
    case 'monthly':
      return 'RRULE:FREQ=MONTHLY;INTERVAL=1';
    case 'quarterly':
      return 'RRULE:FREQ=MONTHLY;INTERVAL=3';
    case 'yearly':
      return 'RRULE:FREQ=YEARLY;INTERVAL=1';
  }
}

export function generateIcsContent(sub: Subscription): string {
  const cleanDate = sub.nextBillingDate.replace(/-/g, '');
  const nextDayDate = parseLocalDate(sub.nextBillingDate);
  nextDayDate.setDate(nextDayDate.getDate() + 1);
  const cleanEndDate = formatDateISO(nextDayDate).replace(/-/g, '');
  const rrule = getRRuleByCycle(sub.cycle);
  const description = `Thanh toán gói đăng ký ${sub.name} (${formatCurrency(sub.amount, sub.currency)} - ${CYCLE_LABELS[sub.cycle]}). Danh mục: ${sub.category}. Nền tảng: ${sub.platform}.${sub.managementUrl ? ` Quản lý tại: ${sub.managementUrl}` : ''}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SubTrack//Subscription Tracker//VI',
    'BEGIN:VEVENT',
    `UID:subtrack-${sub.id}@subtrack.local`,
    `DTSTART;VALUE=DATE:${cleanDate}`,
    `DTEND;VALUE=DATE:${cleanEndDate}`,
    rrule,
    `SUMMARY:Thanh toán ${sub.name} (${formatCurrency(sub.amount, sub.currency)})`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function generateGoogleCalendarUrl(sub: Subscription): string {
  const cleanDate = sub.nextBillingDate.replace(/-/g, '');
  const nextDayDate = parseLocalDate(sub.nextBillingDate);
  nextDayDate.setDate(nextDayDate.getDate() + 1);
  const cleanEndDate = formatDateISO(nextDayDate).replace(/-/g, '');
  const rrule = getRRuleByCycle(sub.cycle);

  const title = `Thanh toán ${sub.name} (${formatCurrency(sub.amount, sub.currency)})`;
  const details = `Gói đăng ký: ${sub.name}\nSố tiền: ${formatCurrency(sub.amount, sub.currency)} (${CYCLE_LABELS[sub.cycle]})\nDanh mục: ${sub.category}\nNền tảng: ${sub.platform}${sub.managementUrl ? `\nQuản lý: ${sub.managementUrl}` : ''}${sub.notes ? `\nGhi chú: ${sub.notes}` : ''}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${cleanDate}/${cleanEndDate}`,
    details,
    recur: rrule,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createSampleSubscriptions(
  todayIso: string,
  defaultCurrency: CurrencyCode = 'VND'
): Subscription[] {
  const baseDate = parseLocalDate(todayIso);
  const addDays = (days: number): string => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return formatDateISO(d);
  };

  const nowIso = new Date().toISOString();
  const isVnd = defaultCurrency === 'VND';

  return [
    {
      id: 'sub-sample-1',
      name: 'Netflix Premium 4K',
      amount: isVnd ? 260000 : 22.99,
      currency: defaultCurrency,
      cycle: 'monthly',
      nextBillingDate: addDays(2),
      category: 'Giải trí',
      status: 'active',
      reminderDays: 3,
      tagIds: ['tag-family', 'tag-entertainment'],
      platform: 'Smart TV',
      managementUrl: 'https://www.netflix.com/youraccount',
      notes: 'Gói gia đình 4 màn hình Ultra HD',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sub-sample-2',
      name: 'Spotify Premium Individual',
      amount: isVnd ? 59000 : 11.99,
      currency: defaultCurrency,
      cycle: 'monthly',
      nextBillingDate: addDays(5),
      category: 'Âm nhạc & Podcast',
      status: 'active',
      reminderDays: 3,
      tagIds: ['tag-personal'],
      platform: 'Google Play (Android)',
      managementUrl: 'https://www.spotify.com/account',
      notes: 'Nghe nhạc không quảng cáo & tải offline trên Android',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sub-sample-3',
      name: 'Google One 2TB Cloud',
      amount: isVnd ? 2250000 : 99.99,
      currency: defaultCurrency,
      cycle: 'yearly',
      nextBillingDate: addDays(24),
      category: 'Lưu trữ đám mây',
      status: 'active',
      reminderDays: 7,
      tagIds: ['tag-essential', 'tag-work'],
      platform: 'Google Play (Android)',
      managementUrl: 'https://one.google.com/settings',
      notes: 'Sao lưu ảnh Google Photos & Android Backup',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sub-sample-4',
      name: 'Figma Professional',
      amount: isVnd ? 375000 : 15.0,
      currency: defaultCurrency,
      cycle: 'monthly',
      nextBillingDate: addDays(14),
      category: 'Thiết kế & Sáng tạo',
      status: 'active',
      reminderDays: 3,
      tagIds: ['tag-work'],
      platform: 'Desktop (macOS/Windows)',
      managementUrl: 'https://www.figma.com/settings',
      notes: 'Công cụ thiết kế giao diện Android Material 3',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sub-sample-5',
      name: 'Coursera Plus Quarterly',
      amount: isVnd ? 1450000 : 59.0,
      currency: defaultCurrency,
      cycle: 'quarterly',
      nextBillingDate: addDays(40),
      category: 'Học tập',
      status: 'paused',
      reminderDays: 7,
      tagIds: ['tag-personal'],
      platform: 'Web',
      managementUrl: 'https://www.coursera.org/my-purchases',
      notes: 'Đang tạm dừng trong học kỳ này',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}
