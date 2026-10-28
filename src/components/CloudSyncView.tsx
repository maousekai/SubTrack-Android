import React, { useState } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogIn,
  LogOut,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertCircle,
} from 'lucide-react';
import { Subscription, Tag } from '../types/subtrack';
import { User } from '../firebase';

interface CloudSyncViewProps {
  currentUser: User | null;
  authLoading: boolean;
  cloudSubCount: number;
  cloudTagCount: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  syncError: string | null;
  cloudAutoSync: boolean;
  localSubscriptions: Subscription[];
  localTags: Tag[];
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onPushLocalToCloud: () => Promise<void>;
  onPullCloudToLocal: () => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => void;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  currentUser,
  authLoading,
  cloudSubCount,
  cloudTagCount,
  lastSyncedAt,
  syncing,
  syncError,
  cloudAutoSync,
  localSubscriptions,
  localTags,
  onSignInGoogle,
  onSignOut,
  onPushLocalToCloud,
  onPullCloudToLocal,
  onToggleAutoSync,
}) => {
  const [localActionStatus, setLocalActionStatus] = useState<string | null>(null);

  const handlePush = async () => {
    setLocalActionStatus(null);
    await onPushLocalToCloud();
    setLocalActionStatus('Đã sao lưu toàn bộ gói đăng ký và tag từ SQLite máy lên Cloud Firestore.');
  };

  const handlePull = async () => {
    setLocalActionStatus(null);
    await onPullCloudToLocal();
    setLocalActionStatus('Đã tải và đồng bộ dữ liệu từ Cloud Firestore về bộ nhớ máy.');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-blue-600">
              UC15 · Firebase Authentication & Cloud Firestore
            </span>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              Đăng nhập & Đồng bộ đám mây
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sao lưu dữ liệu SQLite trên điện thoại Android lên Google Cloud Firestore và đồng bộ tức thời giữa nhiều thiết bị.
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Cloud className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        {/* Comparison: Local SQLite vs Cloud Firestore */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Trên máy (SQLite)</span>
            </div>
            <div className="mt-1.5 text-base font-bold text-slate-900 font-mono tabular-nums">
              {localSubscriptions.length} gói · {localTags.length} tag
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <Cloud className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span>Trên Cloud Firestore</span>
            </div>
            <div className="mt-1.5 text-base font-bold text-slate-900 font-mono tabular-nums">
              {currentUser ? `${cloudSubCount} gói · ${cloudTagCount} tag` : 'Chưa đăng nhập'}
            </div>
          </div>
        </div>
      </div>

      {/* Error or Status Alerts */}
      {syncError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-semibold">Lỗi kết nối đồng bộ đám mây</div>
            <div className="mt-0.5 break-all">{syncError}</div>
          </div>
        </div>
      )}

      {localActionStatus && !syncError && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{localActionStatus}</span>
        </div>
      )}

      {/* Account Authentication Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        {authLoading ? (
          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" aria-hidden="true" />
            <span>Đang kiểm tra trạng thái đăng nhập Firebase...</span>
          </div>
        ) : !currentUser ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base font-bold text-slate-900">
                Đăng nhập bằng tài khoản Google
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ứng dụng vẫn hoạt động 100% offline với SQLite trên máy. Khi đăng nhập Google, toàn bộ gói đăng ký và tag của bạn sẽ được bảo vệ và đồng bộ qua Firebase Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={onSignInGoogle}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Đăng nhập với Google (Firebase Auth)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {(currentUser.displayName || currentUser.email || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {currentUser.displayName || 'Người dùng Android SubTrack'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng xuất</span>
              </button>
            </div>

            {/* Auto-sync toggle */}
            <div className="flex items-center justify-between gap-3 py-1">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Tự động đồng bộ đám mây thời gian thực
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tự động đẩy thay đổi lên Firestore mỗi khi thêm, sửa hoặc xóa gói đăng ký.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={cloudAutoSync}
                aria-label="Tự động đồng bộ đám mây"
                onClick={() => onToggleAutoSync(!cloudAutoSync)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  cloudAutoSync
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {cloudAutoSync ? 'Đang bật tự động' : 'Thủ công'}
              </button>
            </div>

            {/* Manual Push / Pull Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={syncing}
                onClick={handlePush}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                <CloudUpload className="w-4 h-4" aria-hidden="true" />
                <span>
                  {syncing ? 'Đang đồng bộ...' : 'Sao lưu từ Máy → Đám mây'}
                </span>
              </button>

              <button
                type="button"
                disabled={syncing}
                onClick={handlePull}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                <CloudDownload className="w-4 h-4" aria-hidden="true" />
                <span>
                  {syncing ? 'Đang tải...' : 'Khôi phục từ Đám mây → Máy'}
                </span>
              </button>
            </div>

            {lastSyncedAt && (
              <p className="text-[11px] text-slate-400 font-mono text-center pt-1">
                Đồng bộ gần nhất: {new Date(lastSyncedAt).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
