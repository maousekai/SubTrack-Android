import React, { useState } from 'react';
import {
  X,
  Trash2,
  CalendarPlus,
  Download,
  Plus,
  AlertCircle,
  ExternalLink,
  Check,
} from 'lucide-react';
import {
  BillingCycle,
  CurrencyCode,
  ReminderLeadDays,
  Subscription,
  SubscriptionStatus,
  Tag,
  ValidationErrors,
} from '../types/subtrack';
import {
  CATEGORIES,
  CURRENCIES,
  CYCLE_LABELS,
  generateGoogleCalendarUrl,
  generateIcsContent,
  getSuggestedNextMonthDate,
  PLATFORMS,
  REMINDER_OPTIONS,
  STATUS_LABELS,
  TAG_COLORS,
  validateSubscriptionInput,
} from '../utils/subtrackLogic';

interface SubscriptionFormModalProps {
  mode: 'add' | 'edit';
  initialData?: Subscription | null;
  defaultCurrency: CurrencyCode;
  todayIso: string;
  tags: Tag[];
  onClose: () => void;
  onSave: (
    data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => void;
  onDelete?: (id: string) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onNotifyToast: (msg: string) => void;
}

export const SubscriptionFormModal: React.FC<SubscriptionFormModalProps> = ({
  mode,
  initialData,
  defaultCurrency,
  todayIso,
  tags,
  onClose,
  onSave,
  onDelete,
  onCreateTag,
  onNotifyToast,
}) => {
  const [name, setName] = useState(initialData?.name ?? '');
  const [amountInput, setAmountInput] = useState(
    initialData !== undefined && initialData !== null ? String(initialData.amount) : ''
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    initialData?.currency ?? defaultCurrency
  );
  const [cycle, setCycle] = useState<BillingCycle>(initialData?.cycle ?? 'monthly');
  const [nextBillingDate, setNextBillingDate] = useState<string>(
    initialData?.nextBillingDate ?? getSuggestedNextMonthDate(todayIso)
  );
  const [category, setCategory] = useState<string>(
    initialData?.category ?? CATEGORIES[0]
  );
  const [status, setStatus] = useState<SubscriptionStatus>(
    initialData?.status ?? 'active'
  );
  const [reminderDays, setReminderDays] = useState<ReminderLeadDays>(
    initialData?.reminderDays ?? 3
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tagIds ?? []
  );
  const [platform, setPlatform] = useState<string>(
    initialData?.platform ?? PLATFORMS[0]
  );
  const [managementUrl, setManagementUrl] = useState<string>(
    initialData?.managementUrl ?? ''
  );
  const [notes, setNotes] = useState<string>(initialData?.notes ?? '');

  // Validation state (UC12 & UC02 Alt Flow 5a)
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);

  // UC02 Alt Flow 3a: Inline "Tag mới" dialog state
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].hex);
  const [newTagError, setNewTagError] = useState<string | null>(null);

  // UC04: Confirmation dialog "Xóa gói đăng ký?"
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateQuickTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) {
      setNewTagError('Vui lòng nhập tên tag.');
      return;
    }
    if (trimmed.length > 30) {
      setNewTagError('Tên tag tối đa 30 ký tự.');
      return;
    }
    const created = onCreateTag(trimmed, newTagColor);
    // UC02 Luồng thay thế 3a: tag vừa tạo được chọn luôn
    setSelectedTagIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    setNewTagName('');
    setNewTagError(null);
    setShowNewTagDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSubscriptionInput({
      name,
      amountInput,
      nextBillingDate,
      managementUrl,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      // UC02 Luồng thay thế 5a: hiện "Vui lòng sửa các trường bị lỗi"
      setFormBannerError('Vui lòng sửa các trường bị lỗi');
      return;
    }

    setErrors({});
    setFormBannerError(null);

    onSave(
      {
        name: name.trim(),
        amount: validation.parsedAmount,
        currency,
        cycle,
        nextBillingDate,
        category,
        status,
        reminderDays,
        tagIds: selectedTagIds,
        platform,
        managementUrl: managementUrl.trim(),
        notes: notes.trim(),
        lastNotifiedCycleDate: initialData?.lastNotifiedCycleDate,
      },
      initialData?.id
    );
  };

  // UC09: Thêm lịch thanh toán vào Lịch (.ics download)
  const buildDraftSubscription = (): Subscription => ({
    id: initialData?.id ?? 'draft-preview',
    name: name.trim() || 'Gói đăng ký SubTrack',
    amount: Number(amountInput) || 0,
    currency,
    cycle,
    nextBillingDate,
    category,
    status,
    reminderDays,
    tagIds: selectedTagIds,
    platform,
    managementUrl: managementUrl.trim(),
    notes: notes.trim(),
    createdAt: initialData?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleDownloadIcs = () => {
    const draft = buildDraftSubscription();
    const icsContent = generateIcsContent(draft);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSlug = draft.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    a.download = `lich-thanh-toan-${safeSlug || 'subtrack'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotifyToast('Đã tạo tệp sự kiện Lịch (.ics) lặp lại theo chu kỳ thanh toán');
  };

  const googleCalUrl = generateGoogleCalendarUrl(buildDraftSubscription());

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="sub-modal-title" className="text-lg font-bold text-slate-900">
              {mode === 'add' ? 'Thêm gói đăng ký' : 'Sửa gói đăng ký'}
            </h2>
            {mode === 'edit' && initialData && (
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật lần cuối: {new Date(initialData.updatedAt).toLocaleString('vi-VN')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* UC04: Biểu tượng thùng rác trên thanh tiêu đề màn hình Sửa */}
            {mode === 'edit' && initialData && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Xóa gói đăng ký"
                title="Xóa gói đăng ký"
                className="min-h-[40px] min-w-[40px] px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Xóa gói</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng biểu mẫu"
              className="min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 overflow-y-auto">
          {formBannerError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs font-medium text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <span>{formBannerError}</span>
            </div>
          )}

          {/* Row 1: Tên dịch vụ & Trạng thái (UC13) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="sub-name-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tên dịch vụ <span className="text-red-600">*</span>
                <span className="font-normal text-slate-400 ml-1">
                  ({name.trim().length}/60)
                </span>
              </label>
              <input
                id="sub-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="VD: Netflix Premium, Spotify, ChatGPT Plus..."
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.name
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900/10'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="sub-status-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Trạng thái gói
              </label>
              <select
                id="sub-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Số tiền, Tiền tệ, Chu kỳ thanh toán */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="sub-amount-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Số tiền <span className="text-red-600">*</span>
              </label>
              <input
                id="sub-amount-input"
                type="number"
                step="any"
                min="0"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  if (errors.amount) setErrors({ ...errors, amount: undefined });
                }}
                placeholder="VD: 260000"
                className={`w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.amount
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900/10'
                }`}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.amount}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="sub-currency-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tiền tệ
              </label>
              <select
                id="sub-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sub-cycle-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Chu kỳ thanh toán
              </label>
              <select
                id="sub-cycle-select"
                value={cycle}
                onChange={(e) => setCycle(e.target.value as BillingCycle)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((cy) => (
                  <option key={cy} value={cy}>
                    {CYCLE_LABELS[cy]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Ngày thanh toán tiếp theo, Nhắc hạn trước (UC08), Danh mục */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="sub-date-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Ngày thanh toán tiếp theo <span className="text-red-600">*</span>
              </label>
              <input
                id="sub-date-input"
                type="date"
                value={nextBillingDate}
                onChange={(e) => {
                  setNextBillingDate(e.target.value);
                  if (errors.nextBillingDate)
                    setErrors({ ...errors, nextBillingDate: undefined });
                }}
                className={`w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border bg-white text-slate-900 focus:outline-none ${
                  errors.nextBillingDate ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {errors.nextBillingDate && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.nextBillingDate}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="sub-reminder-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nhắc hạn trước
              </label>
              <select
                id="sub-reminder-select"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value) as ReminderLeadDays)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sub-category-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Danh mục
              </label>
              <select
                id="sub-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Nền tảng & Liên kết quản lý (UC12) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="sub-platform-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nền tảng thanh toán
              </label>
              <select
                id="sub-platform-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {PLATFORMS.map((pf) => (
                  <option key={pf} value={pf}>
                    {pf}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="sub-url-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Liên kết quản lý gói (http:// hoặc https://)
              </label>
              <input
                id="sub-url-input"
                type="url"
                value={managementUrl}
                onChange={(e) => {
                  setManagementUrl(e.target.value);
                  if (errors.managementUrl)
                    setErrors({ ...errors, managementUrl: undefined });
                }}
                placeholder="https://www.netflix.com/youraccount"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 focus:outline-none ${
                  errors.managementUrl ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {errors.managementUrl && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.managementUrl}
                </p>
              )}
            </div>
          </div>

          {/* Row 5: Chọn Tag & Nút "Tag mới" (UC02 Luồng thay thế 3a) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Tag phân loại ({selectedTagIds.length} đã chọn)
              </span>
              <button
                type="button"
                onClick={() => setShowNewTagDialog((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tag mới</span>
              </button>
            </div>

            {/* Inline Quick Create Tag Dialog (UC02 Alt 3a) */}
            {showNewTagDialog && (
              <div className="mb-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Tạo tag mới (sẽ được chọn ngay sau khi tạo)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewTagDialog(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Đóng
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    aria-label="Tên tag mới"
                    value={newTagName}
                    onChange={(e) => {
                      setNewTagName(e.target.value);
                      setNewTagError(null);
                    }}
                    placeholder="Nhập tên tag (VD: Giải trí, Học tập...)"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                  <div className="flex items-center gap-1.5">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewTagColor(c.hex)}
                        aria-label={`Chọn màu ${c.name}`}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-transform ${
                          newTagColor === c.hex ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : ''
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {newTagColor === c.hex && (
                          <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateQuickTag}
                    className="px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Tạo & Chọn
                  </button>
                </div>
                {newTagError && (
                  <p className="text-xs text-red-600 font-medium">{newTagError}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagSelection(tag.id)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <span>{tag.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 6: Ghi chú */}
          <div>
            <label
              htmlFor="sub-notes-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Ghi chú
            </label>
            <textarea
              id="sub-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm về gói cước, tài khoản dùng chung hoặc ưu đãi..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* UC09: Thêm lịch thanh toán vào Lịch */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <CalendarPlus className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <span>Thêm lịch thanh toán vào ứng dụng Lịch</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tạo sự kiện lặp lại tự động ({CYCLE_LABELS[cycle].toLowerCase()}) trên Google Calendar hoặc tải tệp .ics cho điện thoại/máy tính.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Mở Google Lịch</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tải tệp .ICS</span>
              </button>
            </div>
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="sticky -bottom-6 -mx-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Lưu
            </button>
          </div>
        </form>

        {/* UC04: Hộp thoại xác nhận "Xóa gói đăng ký?" */}
        {showDeleteConfirm && initialData && onDelete && (
          <div
            className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="delete-confirm-title" className="text-base font-bold text-slate-900">
                    Xóa gói đăng ký?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gói <strong>{initialData.name}</strong> sẽ bị xóa khỏi danh sách và không còn tính vào báo cáo chi phí.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(initialData.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
