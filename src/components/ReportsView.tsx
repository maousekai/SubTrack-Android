import React, { useState } from 'react';
import {
  Download,
  Share2,
  PieChart as PieChartIcon,
  Award,
  Layers,
  Info,
  Copy,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { CurrencyCode, Subscription, Tag } from '../types/subtrack';
import {
  calculateReport,
  CURRENCIES,
  CYCLE_LABELS,
  formatCurrency,
  generateCsvContent,
  generateShareReportText,
} from '../utils/subtrackLogic';

interface ReportsViewProps {
  subscriptions: Subscription[];
  tags: Tag[];
  defaultCurrency: CurrencyCode;
  autoConvertCurrency: boolean;
  onToggleAutoConvertCurrency: (val: boolean) => void;
  onSelectSubscription: (sub: Subscription) => void;
  onNotifyToast: (msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  subscriptions,
  tags,
  defaultCurrency,
  autoConvertCurrency,
  onToggleAutoConvertCurrency,
  onSelectSubscription,
  onNotifyToast,
}) => {
  const [reportCurrency, setReportCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);

  const report = calculateReport(subscriptions, reportCurrency, autoConvertCurrency);
  const totalActiveAllCurrencies = subscriptions.filter((s) => s.status === 'active').length;

  const handleExportCsv = () => {
    const csv = generateCsvContent(subscriptions, tags);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtrack-goi-dang-ky-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotifyToast('Đã xuất danh sách gói đăng ký ra tệp CSV');
  };

  const shareText = generateShareReportText(report);

  const handleCopyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShareText(true);
      onNotifyToast('Đã sao chép tóm tắt báo cáo chi phí vào bộ nhớ tạm');
      setTimeout(() => setCopiedShareText(false), 2000);
    } catch {
      onNotifyToast('Đã sẵn sàng sao chép nội dung báo cáo');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Báo cáo chi phí SubTrack (${reportCurrency})`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback to modal
      }
    }
    setShowShareModal(true);
  };

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="space-y-4">
      {/* Header & Controls (UC06 & UC10) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Báo cáo chi phí định kỳ</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy đổi về tháng: tuần × 52 ÷ 12 · quý ÷ 3 · năm ÷ 12
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="report-currency-select"
              aria-label="Tiền tệ báo cáo"
              value={reportCurrency}
              onChange={(e) => setReportCurrency(e.target.value as CurrencyCode)}
              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xuất CSV</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Chia sẻ báo cáo</span>
            </button>
          </div>
        </div>

        {/* Multi-currency conversion toggle (Suggested Extension for UC06 Alt 2b) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Quy đổi gộp các gói khác tiền tệ theo tỷ giá tham chiếu</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoConvertCurrency}
            onClick={() => onToggleAutoConvertCurrency(!autoConvertCurrency)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              autoConvertCurrency
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {autoConvertCurrency ? 'Đang gộp tỷ giá' : 'Tách riêng (Mặc định UC06)'}
          </button>
        </div>
      </div>

      {/* UC06 Luồng thay thế 2b: Ghi chú số gói dùng tiền tệ khác không được cộng vào */}
      {report.excludedCurrencyCount > 0 && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs text-amber-900"
        >
          <Info className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>
            Có <strong>{report.excludedCurrencyCount} gói đang hoạt động</strong> dùng tiền tệ khác không được cộng vào báo cáo {reportCurrency}. Bạn có thể bật &ldquo;Gộp tỷ giá&rdquo; ở trên nếu muốn quy đổi tự động.
          </span>
        </div>
      )}

      {/* UC06 Luồng thay thế 2a: Chưa có gói đang hoạt động */}
      {totalActiveAllCurrencies === 0 || report.activeMatchingCount === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <PieChartIcon className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900">
            Chưa có gói đang hoạt động để thống kê
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {totalActiveAllCurrencies === 0
              ? 'Hãy thêm gói đăng ký mới hoặc chuyển trạng thái gói sang "Đang hoạt động" để xem phân tích chi phí.'
              : `Hiện không có gói đang hoạt động nào sử dụng đơn vị tiền tệ ${reportCurrency}. Hãy chuyển tiền tệ hoặc bật quy đổi tỷ giá.`}
          </p>
        </div>
      ) : (
        <>
          {/* 4 Chu kỳ Chi phí: Tuần, Tháng, Quý, Năm (2x2 Grid for Mobile Android ergonomics) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-medium text-slate-500">Mỗi tuần</div>
              <div
                data-testid="report-weekly-total"
                className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums mt-1.5"
              >
                {formatCurrency(report.weeklyTotal, reportCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tháng × 12 ÷ 52</div>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-4">
              <div className="text-xs font-semibold text-blue-300">Mỗi tháng (Chuẩn)</div>
              <div
                data-testid="report-monthly-total"
                className="text-base sm:text-lg font-bold text-white font-mono tabular-nums mt-1.5"
              >
                {formatCurrency(report.monthlyTotal, reportCurrency)}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {report.activeMatchingCount} gói đang hoạt động
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-medium text-slate-500">Mỗi quý (3 tháng)</div>
              <div
                data-testid="report-quarterly-total"
                className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums mt-1.5"
              >
                {formatCurrency(report.quarterlyTotal, reportCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tháng × 3</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-medium text-slate-500">Mỗi năm (12 tháng)</div>
              <div
                data-testid="report-yearly-total"
                className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums mt-1.5"
              >
                {formatCurrency(report.yearlyTotal, reportCurrency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tháng × 12</div>
            </div>
          </div>

          {/* Biểu đồ tròn cơ cấu theo gói & Chi phí theo danh mục */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Biểu đồ tròn cơ cấu theo gói
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động gộp &ldquo;Các gói khác&rdquo; khi có trên 6 gói đang hoạt động
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                  <svg
                    className="w-40 h-40 -rotate-90"
                    viewBox="0 0 152 152"
                    role="img"
                    aria-label="Biểu đồ tròn cơ cấu chi phí theo gói"
                  >
                    <circle
                      cx="76"
                      cy="76"
                      r={radius}
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="18"
                    />
                    {report.pieSlices.map((slice) => {
                      const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                      cumulativePercent += slice.percentage;
                      return (
                        <circle
                          key={slice.id}
                          cx="76"
                          cy="76"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                    <span className="text-[10px] text-slate-500 font-medium">Tổng / tháng</span>
                    <span className="text-xs font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {formatCurrency(report.monthlyTotal, reportCurrency)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2">
                  {report.pieSlices.map((slice) => (
                    <div
                      key={slice.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: slice.color }}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-slate-800 truncate">
                          {slice.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                        <span className="text-slate-900 font-semibold">
                          {formatCurrency(slice.monthlyAmount, reportCurrency)}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({slice.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chi phí theo danh mục */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Chi phí theo danh mục
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phân bổ ngân sách hàng tháng theo từng nhóm dịch vụ
                  </p>
                </div>
                <Layers className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>

              <div className="space-y-3.5">
                {report.categoryBreakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{item.category}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500">{item.count} gói</span>
                      </div>
                      <div className="font-mono tabular-nums flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(item.monthlyAmount, reportCurrency)}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all"
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Gói tốn kém nhất */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  3 gói đăng ký tốn kém nhất
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chạm vào một gói để mở màn hình chỉnh sửa chi tiết
                </p>
              </div>
              <Award className="w-4 h-4 text-amber-600" aria-hidden="true" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {report.topExpensive.map((item, idx) => (
                <button
                  key={item.subscription.id}
                  type="button"
                  onClick={() => onSelectSubscription(item.subscription)}
                  className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-white transition-colors flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      0{idx + 1}. Hạng {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {item.subscription.name}
                    </h3>
                  </div>

                  <div>
                    <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(item.monthlyAmount, reportCurrency)}
                      <span className="text-xs font-normal text-slate-500"> / tháng</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.subscription.category} · Gốc:{' '}
                      {formatCurrency(item.subscription.amount, item.subscription.currency)} (
                      {CYCLE_LABELS[item.subscription.cycle]})
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Share Report Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-report-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="share-report-title" className="text-base font-bold text-slate-900">
                Chia sẻ tóm tắt báo cáo chi phí
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                aria-label="Đóng hộp thoại chia sẻ"
                className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap overflow-x-auto">
              {shareText}
            </pre>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCopyShareText}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                {copiedShareText ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sao chép nội dung</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
