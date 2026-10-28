import React, { useState } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Smartphone,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CurrencyCode, Subscription, Tag } from '../types/subtrack';
import {
  formatCurrency,
  PLATFORMS,
  TAG_COLORS,
  toMonthlyCost,
} from '../utils/subtrackLogic';

interface TagsViewProps {
  tags: Tag[];
  subscriptions: Subscription[];
  defaultCurrency: CurrencyCode;
  onCreateTag: (name: string, color: string) => Tag;
  onUpdateTag: (id: string, name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onFilterByTag: (tagId: string) => void;
}

export const TagsView: React.FC<TagsViewProps> = ({
  tags,
  subscriptions,
  defaultCurrency,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onFilterByTag,
}) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0].hex);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError('Vui lòng nhập tên tag.');
      return;
    }
    if (trimmed.length > 30) {
      setCreateError('Tên tag tối đa 30 ký tự.');
      return;
    }
    onCreateTag(trimmed, newColor);
    setNewName('');
    setCreateError(null);
  };

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const saveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdateTag(id, trimmed, editColor);
    setEditingId(null);
  };

  // UC07: Xem số gói theo nền tảng
  const platformStats = PLATFORMS.map((pf) => {
    const matching = subscriptions.filter((s) => s.platform === pf);
    const activeMatching = matching.filter(
      (s) => s.status === 'active' && s.currency === defaultCurrency
    );
    const monthlySum = activeMatching.reduce(
      (sum, s) => sum + toMonthlyCost(s.amount, s.cycle),
      0
    );
    return {
      platform: pf,
      totalCount: matching.length,
      activeCount: matching.filter((s) => s.status === 'active').length,
      monthlySum,
    };
  }).filter((item) => item.totalCount > 0);

  // UC07: Xem chi phí theo danh mục
  const categoryMap = new Map<string, { totalCount: number; monthlyCost: number }>();
  for (const sub of subscriptions) {
    const prev = categoryMap.get(sub.category) || { totalCount: 0, monthlyCost: 0 };
    const addedMonthly =
      sub.status === 'active' && sub.currency === defaultCurrency
        ? toMonthlyCost(sub.amount, sub.cycle)
        : 0;
    categoryMap.set(sub.category, {
      totalCount: prev.totalCount + 1,
      monthlyCost: prev.monthlyCost + addedMonthly,
    });
  }
  const categoryStats = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1].monthlyCost - a[1].monthlyCost
  );

  return (
    <div className="space-y-6">
      {/* Header & Create New Tag Form (UC07) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Quản lý Tag, Nền tảng & Danh mục
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tạo, sửa, xóa tag có màu sắc; theo dõi số gói đăng ký theo từng tag, nền tảng và chi phí theo danh mục.
          </p>
        </div>

        <form
          onSubmit={handleAddTag}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
        >
          <label
            htmlFor="new-tag-name-input"
            className="block text-xs font-semibold text-slate-800"
          >
            Tạo tag phân loại mới
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              id="new-tag-name-input"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setCreateError(null);
              }}
              placeholder="Nhập tên tag (VD: Làm việc từ xa, Giải trí cuối tuần...)"
              className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />

            <div className="flex items-center gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setNewColor(c.hex)}
                  aria-label={`Màu ${c.name}`}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                    newColor === c.hex ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {newColor === c.hex && (
                    <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Thêm tag</span>
            </button>
          </div>
          {createError && (
            <p className="text-xs text-red-600 font-medium">{createError}</p>
          )}
        </form>

        {/* Tag List */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {tags.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Chưa có tag nào. Hãy tạo tag đầu tiên ở biểu mẫu phía trên.
            </div>
          ) : (
            tags.map((tag) => {
              const count = subscriptions.filter((s) => s.tagIds.includes(tag.id)).length;
              const isEditing = editingId === tag.id;

              return (
                <div
                  key={tag.id}
                  className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                      <input
                        type="text"
                        aria-label="Sửa tên tag"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                      <div className="flex items-center gap-1">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setEditColor(c.hex)}
                            aria-label={`Đổi sang màu ${c.name}`}
                            className={`w-6 h-6 rounded-md flex items-center justify-center ${
                              editColor === c.hex ? 'ring-2 ring-slate-900' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {editColor === c.hex && (
                              <Check className="w-3 h-3 text-white" aria-hidden="true" />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => saveEdit(tag.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3.5 h-3.5 rounded-xs shrink-0"
                          style={{ backgroundColor: tag.color }}
                          aria-hidden="true"
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-900">
                            {tag.name}
                          </span>
                          <span aria-hidden="true" className="mx-2 text-slate-300">
                            ·
                          </span>
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {count} gói đăng ký
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {count > 0 && (
                          <button
                            type="button"
                            onClick={() => onFilterByTag(tag.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <span>Xem {count} gói</span>
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditing(tag)}
                          aria-label={`Sửa tag ${tag.name}`}
                          className="min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTag(tag.id)}
                          aria-label={`Xóa tag ${tag.name}`}
                          className="min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* UC07 Part 2: Thống kê theo Nền tảng & Danh mục */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Số gói theo nền tảng */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Số gói theo nền tảng thanh toán
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân bổ gói đăng ký trên các thiết bị và cổng thanh toán
              </p>
            </div>
            <Smartphone className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>

          {platformStats.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">Chưa có dữ liệu nền tảng.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {platformStats.map((pf) => (
                <div
                  key={pf.platform}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{pf.platform}</span>
                    <span aria-hidden="true" className="mx-2 text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-500">
                      {pf.activeCount} đang hoạt động / {pf.totalCount} gói
                    </span>
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-slate-900">
                    {formatCurrency(pf.monthlySum, defaultCurrency)}/tháng
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chi phí theo danh mục */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tổng hợp chi phí theo danh mục
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Số lượng gói và chi phí quy đổi tháng ({defaultCurrency})
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>

          {categoryStats.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">Chưa có dữ liệu danh mục.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {categoryStats.map(([cat, stats]) => (
                <div
                  key={cat}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{cat}</span>
                    <span aria-hidden="true" className="mx-2 text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-500 font-mono tabular-nums">
                      {stats.totalCount} gói
                    </span>
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-slate-900">
                    {formatCurrency(stats.monthlyCost, defaultCurrency)}/tháng
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
