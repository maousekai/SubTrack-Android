import React, { useState } from 'react';
import {
  Bell,
  Database,
  Trash2,
  FileText,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Target,
  Code2,
  BookOpen,
} from 'lucide-react';
import { AppSettings, CurrencyCode } from '../types/subtrack';
import { CURRENCIES, formatCurrency } from '../utils/subtrackLogic';

interface SettingsViewProps {
  settings: AppSettings;
  subscriptionCount: number;
  tagCount: number;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onSendTestNotification: () => void;
  onAddSamplePackages: () => void;
  onClearAllData: () => void;
  onOpenOnboarding: () => void;
  onOpenAndroidProject: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  subscriptionCount,
  tagCount,
  onUpdateSettings,
  onSendTestNotification,
  onAddSamplePackages,
  onClearAllData,
  onOpenOnboarding,
  onOpenAndroidProject,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showUseCaseDoc, setShowUseCaseDoc] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    settings.monthlyBudget > 0 ? String(settings.monthlyBudget) : ''
  );

  const browserNotificationStatus =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      await Notification.requestPermission();
      onUpdateSettings({ remindersEnabled: true });
    }
  };

  const handleApplyBudget = (val: number) => {
    const clean = Math.max(0, val);
    setBudgetInput(clean > 0 ? String(clean) : '');
    onUpdateSettings({ monthlyBudget: clean });
  };

  return (
    <div className="space-y-4">
      {/* Native Android Studio Project Card */}
      <div className="bg-emerald-950 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-emerald-300">
            Dành cho Android Studio · Kotlin · Jetpack Compose · Room SQLite · WorkManager
          </div>
          <h2 className="text-base font-bold">
            Xuất trọn bộ Mã nguồn Project Android Gốc (.APK)
          </h2>
          <p className="text-xs text-emerald-200 leading-relaxed">
            Xem hoặc tải toàn bộ cấu trúc project Android Studio đã tích hợp Room SQLite, WorkManager, Intent Lịch và Firebase Firestore.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAndroidProject}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <Code2 className="w-4 h-4" aria-hidden="true" />
          <span>Mã nguồn Android Studio</span>
        </button>
      </div>

      {/* Main Settings Card (UC11) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Cài đặt ứng dụng</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập tiền tệ mặc định, hạn mức ngân sách, thông báo nhắc hạn Android WorkManager và dữ liệu SQLite.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {/* 1. Tiền tệ mặc định */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label
                htmlFor="settings-default-currency"
                className="text-sm font-semibold text-slate-900 block"
              >
                Tiền tệ mặc định
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Áp dụng cho thẻ Tổng quan chi phí và tự động chọn khi thêm gói đăng ký mới.
              </p>
            </div>
            <select
              id="settings-default-currency"
              value={settings.defaultCurrency}
              onChange={(e) =>
                onUpdateSettings({ defaultCurrency: e.target.value as CurrencyCode })
              }
              className="w-full sm:w-44 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Suggested Feature: Hạn mức ngân sách hàng tháng */}
          <div className="py-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label
                  htmlFor="settings-monthly-budget"
                  className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                >
                  <Target className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Hạn mức ngân sách chi tiêu hàng tháng ({settings.defaultCurrency})</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hiển thị thanh cảnh báo trên màn hình Tổng quan khi tổng chi phí tháng vượt 80% hoặc 100% hạn mức.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="settings-monthly-budget"
                  type="number"
                  min="0"
                  step="any"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="0 = Không giới hạn"
                  className="w-36 px-3 py-2 text-xs font-mono tabular-nums rounded-xl border border-slate-300 bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleApplyBudget(Number(budgetInput) || 0)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Lưu hạn mức
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[500000, 1000000, 2000000, 0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyBudget(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    settings.monthlyBudget === preset
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset === 0
                    ? 'Tắt hạn mức'
                    : formatCurrency(preset, settings.defaultCurrency)}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nhắc hạn thanh toán & Thông báo thử (UC08, UC11, UC14) */}
          <div className="py-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Hệ thống nhắc hạn thanh toán (WorkManager)</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kiểm tra hằng ngày và ngay sau khi lưu gói; mỗi kỳ thanh toán chỉ nhắc một lần.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.remindersEnabled}
                  aria-label="Bật hoặc tắt nhắc hạn thanh toán"
                  onClick={() =>
                    onUpdateSettings({ remindersEnabled: !settings.remindersEnabled })
                  }
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                    settings.remindersEnabled
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {settings.remindersEnabled ? 'Đang bật nhắc hạn' : 'Đang tắt nhắc hạn'}
                </button>

                <button
                  type="button"
                  onClick={onSendTestNotification}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Gửi thông báo thử
                </button>
              </div>
            </div>

            {browserNotificationStatus === 'denied' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <strong>Hướng dẫn bật quyền thông báo Android 13+:</strong> Quyền thông báo hiện đang bị từ chối. Vui lòng mở <em>Cài đặt Android → Ứng dụng → SubTrack → Thông báo</em> và bật Cho phép.
              </div>
            )}
            {browserNotificationStatus === 'default' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Cấp quyền thông báo trên Android 13+ để nhận cảnh báo nhắc hạn trên thanh trạng thái.
                </span>
                <button
                  type="button"
                  onClick={handleRequestBrowserPermission}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  Cấp quyền thông báo
                </button>
              </div>
            )}
          </div>

          {/* 4. Dữ liệu mẫu, Màn hình giới thiệu & Xóa toàn bộ dữ liệu (UC11) */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <span>Dữ liệu SQLite trên máy ({subscriptionCount} gói, {tagCount} tag)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thêm nhanh 5 gói mẫu, mở lại màn hình giới thiệu lần đầu hoặc xóa sạch dữ liệu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Màn hình giới thiệu</span>
              </button>

              <button
                type="button"
                onClick={onAddSamplePackages}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <span>Thêm 5 gói mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Xóa toàn bộ dữ liệu</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tài liệu Đặc tả Use Case SubTrack PDF */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <span>Tài liệu Đặc tả Use Case SubTrack (UC01 – UC15)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem sơ đồ Use Case tổng quát và bảng đặc tả chi tiết đính kèm.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowUseCaseDoc((prev) => !prev)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            {showUseCaseDoc ? 'Ẩn tài liệu PDF' : 'Xem PDF tại đây'}
          </button>
          <a
            href="/assets/aistudio/UseCase_SubTrack_31cbea36.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>Mở tab mới</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {showUseCaseDoc && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3">
          <iframe
            src="/assets/aistudio/UseCase_SubTrack_31cbea36.pdf"
            title="Sơ đồ Use Case SubTrack PDF"
            className="w-full h-[520px] rounded-xl border border-slate-200"
          />
        </div>
      )}

      {/* Confirmation Dialog for Clearing All Data */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-data-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="clear-data-title" className="text-base font-bold text-slate-900">
                  Xóa toàn bộ dữ liệu?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Toàn bộ {subscriptionCount} gói đăng ký và thông báo sẽ bị xóa khỏi thiết bị. Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Xác nhận xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
