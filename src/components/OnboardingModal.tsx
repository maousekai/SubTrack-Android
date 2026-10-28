import React, { useState } from 'react';
import {
  Smartphone,
  BellRing,
  Cloud,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    step: '01',
    title: 'Quản lý gói đăng ký định kỳ trên Android',
    subtitle: 'Lưu trữ SQLite cục bộ · Nhanh & Riêng tư',
    description:
      'Theo dõi mọi khoản chi định kỳ (Netflix, Spotify, Google One, YouTube Premium...) theo tuần, tháng, quý, năm. Hoạt động offline 100% với cơ sở dữ liệu trên máy.',
    icon: Smartphone,
    highlights: [
      'Tự động quy đổi chi phí về tháng chuẩn xác',
      'Tìm kiếm, lọc trạng thái và gắn Tag có màu sắc',
      'Cảnh báo hạn mức ngân sách chi tiêu hàng tháng',
    ],
  },
  {
    step: '02',
    title: 'Nhắc hạn WorkManager & Ứng dụng Lịch',
    subtitle: 'Không bao giờ quên hủy gói dùng thử',
    description:
      'Hệ thống tự động kiểm tra hằng ngày và ngay sau khi lưu gói. Mỗi kỳ thanh toán chỉ nhắc 1 lần và tự động chuyển sang kỳ kế tiếp khi qua ngày.',
    icon: BellRing,
    highlights: [
      'Tùy chọn nhắc đúng ngày hoặc trước 1, 3, 7, 30 ngày',
      'Xuất sự kiện lặp lại (RRULE) sang Lịch Android / Google Calendar',
      'Đánh dấu "Đã thanh toán kỳ này" chỉ với 1 chạm',
    ],
  },
  {
    step: '03',
    title: 'Đồng bộ đám mây Firebase & Xuất CSV',
    subtitle: 'UC15 đã được tích hợp hoàn chỉnh',
    description:
      'Đăng nhập Google qua Firebase Authentication để sao lưu và đồng bộ danh sách gói đăng ký lên Cloud Firestore an toàn giữa mọi thiết bị Android.',
    icon: Cloud,
    highlights: [
      'Sao lưu & khôi phục dữ liệu đám mây thời gian thực',
      'Quy đổi đa tiền tệ (VND, USD, EUR, JPY, GBP)',
      'Xuất báo cáo CSV & Tải trọn bộ mã nguồn Android Studio (Kotlin)',
    ],
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const current = SLIDES[index];
  const IconComp = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-blue-600">
            BƯỚC {current.step} / 03
          </span>
          <button
            type="button"
            onClick={onComplete}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1"
          >
            Bỏ qua giới thiệu
          </button>
        </div>

        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <IconComp className="w-7 h-7" aria-hidden="true" />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">
              {current.subtitle}
            </div>
            <h2
              id="onboarding-title"
              className="text-xl font-bold text-slate-900 mt-1 leading-snug"
            >
              {current.title}
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {current.description}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            {current.highlights.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-xs text-slate-800">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Indicator & Next Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                aria-label={`Chuyển tới trang giới thiệu ${idx + 1}`}
                onClick={() => setIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === index ? 'w-6 bg-slate-900' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {index < SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Tiếp theo</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Bắt đầu sử dụng SubTrack</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
