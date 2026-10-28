/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Bell,
  CalendarPlus,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Sparkles,
  X,
  ListFilter,
  PieChart,
  Tag as TagIcon,
  Settings as SettingsIcon,
  CreditCard,
  Cloud,
  Wifi,
  BatteryCharging,
  Smartphone,
  Maximize2,
  Minimize2,
  Code2,
  CheckCheck,
  Play,
  BookOpen,
  Download,
} from 'lucide-react';
import {
  AppSettings,
  NotificationItem,
  SortOption,
  Subscription,
  SubscriptionStatus,
  Tag,
} from './types/subtrack';
import {
  addOneCycle,
  advancePastBillingDate,
  calculateOverview,
  CATEGORIES,
  checkDueNotifications,
  createSampleSubscriptions,
  CYCLE_LABELS,
  DEFAULT_TAGS,
  filterAndSortSubscriptions,
  formatCurrency,
  formatDateISO,
  formatDisplayDate,
  generateGoogleCalendarUrl,
  getDaysUntilBilling,
  STATUS_LABELS,
  toMonthlyCost,
} from './utils/subtrackLogic';
import { OverviewCards } from './components/OverviewCards';
import { SubscriptionFormModal } from './components/SubscriptionFormModal';
import { ReportsView } from './components/ReportsView';
import { TagsView } from './components/TagsView';
import { SettingsView } from './components/SettingsView';
import { CloudSyncView } from './components/CloudSyncView';
import { OnboardingModal } from './components/OnboardingModal';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  User,
} from './firebase';

type ActiveTab = 'subscriptions' | 'reports' | 'tags' | 'cloud' | 'settings';

const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'subtrack_sqlite_subscriptions_v1',
  TAGS: 'subtrack_sqlite_tags_v1',
  SETTINGS: 'subtrack_sqlite_settings_v1',
  NOTIFICATIONS: 'subtrack_sqlite_notifications_v1',
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  const todayIso = useMemo(() => formatDateISO(new Date()), []);

  // Load Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          defaultCurrency: parsed.defaultCurrency ?? 'VND',
          remindersEnabled: parsed.remindersEnabled ?? true,
          hasCompletedOnboarding: parsed.hasCompletedOnboarding ?? true,
          monthlyBudget: parsed.monthlyBudget ?? 1200000,
          autoConvertCurrency: parsed.autoConvertCurrency ?? false,
          cloudAutoSync: parsed.cloudAutoSync ?? true,
        };
      }
    } catch {
      // ignore
    }
    return {
      defaultCurrency: 'VND',
      remindersEnabled: true,
      hasCompletedOnboarding: true,
      monthlyBudget: 1200000,
      autoConvertCurrency: false,
      cloudAutoSync: true,
    };
  });

  // Load Tags
  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TAGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_TAGS;
  });

  // Load Subscriptions & auto-advance past dates (UC08/UC14 Postcondition)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
      if (saved) {
        const parsed: Subscription[] = JSON.parse(saved);
        return parsed.map((sub) => ({
          ...sub,
          nextBillingDate:
            sub.status === 'active'
              ? advancePastBillingDate(sub.nextBillingDate, sub.cycle, todayIso)
              : sub.nextBillingDate,
        }));
      }
    } catch {
      // ignore
    }
    return createSampleSubscriptions(todayIso, 'VND');
  });

  // Load Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('subscriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Android Device Frame vs Expanded Layout
  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState(true);

  // Modals State
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAndroidProjectModal, setShowAndroidProjectModal] = useState(false);

  // Toast & Android Notification Shade State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // PWA Install Prompt State
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // UC15 Firebase Auth & Cloud Firestore State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudSubCount, setCloudSubCount] = useState(0);
  const [cloudTagCount, setCloudTagCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Persist to localStorage (SQLite Local Mirror)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    } catch {
      // ignore
    }
  }, [tags]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
    } catch {
      // ignore
    }
  }, [subscriptions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  // UC15: Firebase Auth State & Real-Time Firestore Listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      setSyncError(null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setCloudSubCount(0);
      setCloudTagCount(0);
      return;
    }

    const subsPath = `users/${currentUser.uid}/subscriptions`;
    const tagsPath = `users/${currentUser.uid}/tags`;

    const unsubSubs = onSnapshot(
      collection(db, subsPath),
      (snap) => {
        setCloudSubCount(snap.size);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, subsPath);
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : String(e));
        }
      }
    );

    const unsubTags = onSnapshot(
      collection(db, tagsPath),
      (snap) => {
        setCloudTagCount(snap.size);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, tagsPath);
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : String(e));
        }
      }
    );

    return () => {
      unsubSubs();
      unsubTags();
    };
  }, [currentUser]);

  // Helper to push a single subscription to Firestore if autoSync is active
  const syncSingleSubToCloud = async (sub: Subscription) => {
    if (!currentUser || !settings.cloudAutoSync) return;
    const path = `users/${currentUser.uid}/subscriptions/${sub.id}`;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'subscriptions', sub.id), {
        ownerId: currentUser.uid,
        name: sub.name.slice(0, 60),
        amount: Math.max(0, Number(sub.amount) || 0),
        currency: sub.currency,
        cycle: sub.cycle,
        nextBillingDate: sub.nextBillingDate,
        category: sub.category.slice(0, 60),
        status: sub.status,
        reminderDays: sub.reminderDays,
        tagIds: sub.tagIds.slice(0, 10),
        platform: sub.platform.slice(0, 60),
        managementUrl: (sub.managementUrl || '').slice(0, 500),
        notes: (sub.notes || '').slice(0, 500),
        updatedAtIso: sub.updatedAt.slice(0, 40),
      });
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : String(e));
      }
    }
  };

  // UC15 Handlers
  const handleSignInGoogle = async () => {
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Đã đăng nhập Firebase Authentication thành công');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Không thể đăng nhập Google');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast('Đã đăng xuất khỏi tài khoản đám mây');
  };

  const handlePushLocalToCloud = async () => {
    if (!currentUser) return;
    setSyncing(true);
    setSyncError(null);
    try {
      for (const t of tags) {
        const path = `users/${currentUser.uid}/tags/${t.id}`;
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'tags', t.id), {
            ownerId: currentUser.uid,
            name: t.name.slice(0, 30),
            color: t.color.slice(0, 20),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      for (const sub of subscriptions) {
        const path = `users/${currentUser.uid}/subscriptions/${sub.id}`;
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'subscriptions', sub.id), {
            ownerId: currentUser.uid,
            name: sub.name.slice(0, 60),
            amount: Math.max(0, Number(sub.amount) || 0),
            currency: sub.currency,
            cycle: sub.cycle,
            nextBillingDate: sub.nextBillingDate,
            category: sub.category.slice(0, 60),
            status: sub.status,
            reminderDays: sub.reminderDays,
            tagIds: sub.tagIds.slice(0, 10),
            platform: sub.platform.slice(0, 60),
            managementUrl: (sub.managementUrl || '').slice(0, 500),
            notes: (sub.notes || '').slice(0, 500),
            updatedAtIso: (sub.updatedAt || new Date().toISOString()).slice(0, 40),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      setLastSyncedAt(new Date().toISOString());
      showToast('Đã đồng bộ dữ liệu lên Cloud Firestore');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const handlePullCloudToLocal = async () => {
    if (!currentUser) return;
    setSyncing(true);
    setSyncError(null);
    const subsPath = `users/${currentUser.uid}/subscriptions`;
    const tagsPath = `users/${currentUser.uid}/tags`;
    try {
      const tagsSnap = await getDocs(collection(db, tagsPath));
      const fetchedTags: Tag[] = [];
      tagsSnap.forEach((d) => {
        const data = d.data();
        fetchedTags.push({
          id: d.id,
          name: String(data.name || ''),
          color: String(data.color || '#2563EB'),
        });
      });
      if (fetchedTags.length > 0) {
        setTags(fetchedTags);
      }

      const subsSnap = await getDocs(collection(db, subsPath));
      const fetchedSubs: Subscription[] = [];
      subsSnap.forEach((d) => {
        const data = d.data();
        fetchedSubs.push({
          id: d.id,
          name: String(data.name || ''),
          amount: Number(data.amount) || 0,
          currency: data.currency || 'VND',
          cycle: data.cycle || 'monthly',
          nextBillingDate: String(data.nextBillingDate || todayIso),
          category: String(data.category || CATEGORIES[0]),
          status: data.status || 'active',
          reminderDays: data.reminderDays ?? 3,
          tagIds: Array.isArray(data.tagIds) ? data.tagIds : [],
          platform: String(data.platform || 'Google Play (Android)'),
          managementUrl: String(data.managementUrl || ''),
          notes: String(data.notes || ''),
          createdAt: String(data.updatedAtIso || new Date().toISOString()),
          updatedAt: String(data.updatedAtIso || new Date().toISOString()),
        });
      });
      if (fetchedSubs.length > 0) {
        setSubscriptions(fetchedSubs);
      }

      setLastSyncedAt(new Date().toISOString());
      showToast('Đã khôi phục dữ liệu từ Cloud Firestore về máy');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.GET, subsPath);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSyncing(false);
    }
  };

  // UC14: WorkManager daily / post-save check
  const triggerDueCheck = (currentSubs: Subscription[], remindersEnabled: boolean) => {
    const { dueNotifications, updatedSubscriptions } = checkDueNotifications(
      currentSubs,
      remindersEnabled,
      todayIso
    );
    if (dueNotifications.length > 0) {
      setSubscriptions(updatedSubscriptions);
      const nowIso = new Date().toISOString();
      const newItems: NotificationItem[] = dueNotifications.map((d, idx) => ({
        id: `notif-${Date.now()}-${idx}`,
        subscriptionId: d.subscriptionId,
        title: d.title,
        message: d.message,
        createdAt: nowIso,
        read: false,
      }));
      setNotifications((prev) => [...newItems, ...prev]);

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        dueNotifications.forEach((d) => {
          try {
            new Notification(d.title, { body: d.message });
          } catch {
            // ignore
          }
        });
      }
    }
  };

  useEffect(() => {
    triggerDueCheck(subscriptions, settings.remindersEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overview calculations (UC01)
  const overview = useMemo(
    () =>
      calculateOverview(
        subscriptions,
        settings.defaultCurrency,
        todayIso,
        settings.autoConvertCurrency
      ),
    [subscriptions, settings.defaultCurrency, todayIso, settings.autoConvertCurrency]
  );

  // Filtered and Sorted Subscriptions (UC05)
  const filteredSubscriptions = useMemo(
    () =>
      filterAndSortSubscriptions(subscriptions, tags, {
        searchQuery,
        statusFilter,
        categoryFilter,
        tagFilter,
        sortBy,
      }),
    [subscriptions, tags, searchQuery, statusFilter, categoryFilter, tagFilter, sortBy]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    tagFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setTagFilter('all');
  };

  const handleOpenAddModal = () => {
    setEditingSubscription(null);
    setModalMode('add');
  };

  const handleOpenEditModal = (sub: Subscription) => {
    const found = subscriptions.find((s) => s.id === sub.id);
    if (!found) {
      showToast('Không tìm thấy gói đăng ký này');
      return;
    }
    setEditingSubscription(found);
    setModalMode('edit');
  };

  const handleSaveSubscription = (
    data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();
    const rolledDate =
      data.status === 'active'
        ? advancePastBillingDate(data.nextBillingDate, data.cycle, todayIso)
        : data.nextBillingDate;

    let savedSub: Subscription;
    let nextList: Subscription[];
    if (existingId) {
      savedSub = {
        ...(subscriptions.find((s) => s.id === existingId) as Subscription),
        ...data,
        nextBillingDate: rolledDate,
        updatedAt: nowIso,
      };
      nextList = subscriptions.map((item) =>
        item.id === existingId ? savedSub : item
      );
    } else {
      savedSub = {
        ...data,
        id: `sub-${Date.now()}`,
        nextBillingDate: rolledDate,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      nextList = [savedSub, ...subscriptions];
    }

    const { dueNotifications, updatedSubscriptions } = checkDueNotifications(
      nextList,
      settings.remindersEnabled,
      todayIso
    );
    setSubscriptions(updatedSubscriptions);
    void syncSingleSubToCloud(savedSub);

    if (dueNotifications.length > 0) {
      const newItems: NotificationItem[] = dueNotifications.map((d, idx) => ({
        id: `notif-${Date.now()}-${idx}`,
        subscriptionId: d.subscriptionId,
        title: d.title,
        message: d.message,
        createdAt: nowIso,
        read: false,
      }));
      setNotifications((prev) => [...newItems, ...prev]);
    }

    setModalMode(null);
    setEditingSubscription(null);
    showToast('Đã lưu gói đăng ký');
  };

  // UC04: Xóa gói đăng ký
  const handleDeleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((item) => item.id !== id));
    setNotifications((prev) => prev.filter((n) => n.subscriptionId !== id));
    if (currentUser && settings.cloudAutoSync) {
      const path = `users/${currentUser.uid}/subscriptions/${id}`;
      deleteDoc(doc(db, 'users', currentUser.uid, 'subscriptions', id)).catch((err) => {
        try {
          handleFirestoreError(err, OperationType.DELETE, path);
        } catch {
          // ignore
        }
      });
    }
    setModalMode(null);
    setEditingSubscription(null);
    showToast('Đã xóa gói đăng ký');
  };

  // UC13: Quick status change
  const handleQuickChangeStatus = (id: string, newStatus: SubscriptionStatus) => {
    const nowIso = new Date().toISOString();
    setSubscriptions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, status: newStatus, updatedAt: nowIso };
          void syncSingleSubToCloud(updated);
          return updated;
        }
        return item;
      })
    );
    showToast(`Đã đổi trạng thái sang "${STATUS_LABELS[newStatus]}"`);
  };

  // Suggested Feature: Đánh dấu "Đã thanh toán kỳ này" -> chuyển sang kỳ kế tiếp
  const handleMarkCyclePaid = (sub: Subscription) => {
    const nextDate = addOneCycle(sub.nextBillingDate, sub.cycle);
    const nowIso = new Date().toISOString();
    const updated: Subscription = {
      ...sub,
      nextBillingDate: nextDate,
      lastNotifiedCycleDate: undefined,
      updatedAt: nowIso,
    };
    setSubscriptions((prev) =>
      prev.map((item) => (item.id === sub.id ? updated : item))
    );
    void syncSingleSubToCloud(updated);
    showToast(
      `Đã ghi nhận thanh toán ${sub.name} · Kỳ kế tiếp: ${formatDisplayDate(nextDate)}`
    );
  };

  // UC07: Tag CRUD
  const handleCreateTag = (name: string, color: string): Tag => {
    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      color,
    };
    setTags((prev) => [...prev, newTag]);
    if (currentUser && settings.cloudAutoSync) {
      setDoc(doc(db, 'users', currentUser.uid, 'tags', newTag.id), {
        ownerId: currentUser.uid,
        name: newTag.name.slice(0, 30),
        color: newTag.color.slice(0, 20),
      }).catch(() => {});
    }
    showToast(`Đã tạo tag "${name}"`);
    return newTag;
  };

  const handleUpdateTag = (id: string, name: string, color: string) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name, color } : t)));
    showToast('Đã cập nhật thông tin tag');
  };

  const handleDeleteTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setSubscriptions((prev) =>
      prev.map((s) => ({
        ...s,
        tagIds: s.tagIds.filter((tid) => tid !== id),
      }))
    );
    if (tagFilter === id) setTagFilter('all');
    showToast('Đã xóa tag');
  };

  // UC11: Settings Actions
  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    showToast('Đã lưu cài đặt ứng dụng');
  };

  const handleSendTestNotification = () => {
    const nowIso = new Date().toISOString();
    const testNotif: NotificationItem = {
      id: `notif-test-${Date.now()}`,
      title: 'Thông báo thử nghiệm từ SubTrack',
      message:
        'WorkManager & Dịch vụ thông báo Android của SubTrack đang hoạt động bình thường.',
      createdAt: nowIso,
      read: false,
      isTest: true,
    };
    setNotifications((prev) => [testNotif, ...prev]);
    setShowNotificationPanel(true);
    showToast('Đã gửi thông báo thử nghiệm');
  };

  const handleAddSamplePackages = () => {
    const samples = createSampleSubscriptions(todayIso, settings.defaultCurrency).map(
      (s, idx) => ({
        ...s,
        id: `sub-sample-${Date.now()}-${idx}`,
      })
    );
    setSubscriptions((prev) => [...samples, ...prev]);
    showToast('Đã thêm 5 gói đăng ký mẫu');
    setActiveTab('subscriptions');
  };

  const handleClearAllData = () => {
    setSubscriptions([]);
    setNotifications([]);
    showToast('Đã xóa toàn bộ dữ liệu gói đăng ký');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const tagLookup = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 flex flex-col">
      {/* Top Bar Contract for Desktop Android Studio Workspace */}
      <header className="bg-slate-950 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3">
          {/* Zone 1: Brand wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('subscriptions');
            }}
            className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            SubTrack Android
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300"
          >
            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === 'subscriptions'
                  ? 'text-white font-semibold border-blue-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Gói đăng ký
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === 'reports'
                  ? 'text-white font-semibold border-blue-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Báo cáo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === 'tags'
                  ? 'text-white font-semibold border-blue-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Quản lý tag
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === 'cloud'
                  ? 'text-white font-semibold border-blue-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Đồng bộ đám mây
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === 'settings'
                  ? 'text-white font-semibold border-blue-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Cài đặt
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-blue-400 rounded-xl hover:bg-blue-300 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Thêm gói đăng ký</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Android Phone App Frame + Android Inspector Panel on Desktop */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 py-0 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Android Smartphone Device Shell */}
        <div
          className={`${
            isPhoneFrameMode ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12'
          } w-full bg-slate-100 sm:rounded-[36px] sm:border-[6px] sm:border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-[820px]`}
        >
          {/* Android 14 System Status Bar */}
          <div className="bg-slate-950 text-white px-5 py-2 flex items-center justify-between text-[11px] font-mono select-none shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">20:30</span>
              <span className="text-slate-400">·</span>
              <span className="text-blue-300 font-sans font-medium">Android 14</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <span>5G</span>
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              <div className="inline-flex items-center gap-1">
                <span>98%</span>
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Material 3 Top App Bar inside Android Device */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                ST
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {activeTab === 'subscriptions' && 'SubTrack — Gói đăng ký'}
                  {activeTab === 'reports' && 'Báo cáo chi phí'}
                  {activeTab === 'tags' && 'Quản lý Tag & Nền tảng'}
                  {activeTab === 'cloud' && 'Đồng bộ đám mây (UC15)'}
                  {activeTab === 'settings' && 'Cài đặt ứng dụng'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {currentUser
                    ? `Đã kết nối Cloud: ${currentUser.email}`
                    : 'SQLite Trên máy · WorkManager Đang bật'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNotificationPanel((prev) => !prev);
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                }}
                aria-label={`Thông báo nhắc hạn (${notifications.length})`}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4 text-slate-700" aria-hidden="true" />
                <span className="font-mono tabular-nums">{notifications.length}</span>
                {unreadCount > 0 && (
                  <span className="text-amber-700 font-bold">· {unreadCount} mới</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPhoneFrameMode((prev) => !prev)}
                aria-label={
                  isPhoneFrameMode ? 'Mở rộng toàn màn hình' : 'Thu gọn khung điện thoại'
                }
                title={
                  isPhoneFrameMode ? 'Mở rộng toàn màn hình' : 'Thu gọn khung điện thoại'
                }
                className="hidden lg:inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                {isPhoneFrameMode ? (
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Minimize2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Pull-Down Android Notification Shade (UC14 WorkManager) */}
          {showNotificationPanel && (
            <section
              aria-label="Danh sách thông báo nhắc hạn"
              className="bg-slate-900 text-white p-4 space-y-3 border-b border-slate-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-white">
                    Thanh thông báo Android · WorkManager (UC14)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Chạm vào thông báo để mở chi tiết gói đăng ký.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setNotifications([])}
                      className="text-[11px] text-slate-300 hover:text-white px-2 py-1"
                    >
                      Xóa tất cả
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotificationPanel(false)}
                    aria-label="Đóng thanh thông báo"
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Không có thông báo nhắc hạn mới.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white">{notif.title}</div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{notif.message}</p>
                      </div>
                      {notif.subscriptionId && (
                        <button
                          type="button"
                          onClick={() => {
                            const target = subscriptions.find(
                              (s) => s.id === notif.subscriptionId
                            );
                            if (target) {
                              handleOpenEditModal(target);
                              setShowNotificationPanel(false);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          Mở gói
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Scrollable Android Screen Body */}
          <main className="flex-1 p-3.5 sm:p-4 space-y-4 overflow-y-auto">
            {/* TAB 1: GÓI ĐĂNG KÝ */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                <OverviewCards
                  estimatedMonthlyCost={overview.estimatedMonthlyCost}
                  activeCount={overview.activeCount}
                  totalCount={subscriptions.length}
                  dueIn7DaysCount={overview.dueIn7DaysCount}
                  dueIn7DaysList={overview.dueIn7DaysList}
                  otherCurrencyActiveCount={overview.otherCurrencyActiveCount}
                  defaultCurrency={settings.defaultCurrency}
                  monthlyBudget={settings.monthlyBudget}
                  autoConvertCurrency={settings.autoConvertCurrency}
                  todayIso={todayIso}
                  onSelectSubscription={handleOpenEditModal}
                />

                {/* UC05: Tìm kiếm, lọc, sắp xếp */}
                <section
                  aria-label="Tìm kiếm, lọc và sắp xếp gói đăng ký"
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3"
                >
                  <div className="relative">
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      aria-label="Tìm kiếm theo tên, tag, nền tảng hoặc danh mục"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên, tag, nền tảng, danh mục..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/60 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      aria-label="Lọc theo danh mục"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      <option value="all">Tất cả danh mục</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Lọc theo tag"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      <option value="all">Tất cả tag</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          Tag: {t.name}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Sắp xếp danh sách"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="date">Sắp xếp: Ngày gần nhất</option>
                      <option value="cost">Sắp xếp: Chi phí tháng cao nhất</option>
                      <option value="name">Sắp xếp: Tên (A–Z)</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div
                      role="group"
                      aria-label="Lọc theo trạng thái gói"
                      className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl"
                    >
                      {(
                        [
                          { value: 'all', label: 'Tất cả' },
                          { value: 'active', label: 'Đang hoạt động' },
                          { value: 'paused', label: 'Tạm dừng' },
                          { value: 'cancelled', label: 'Đã hủy' },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setStatusFilter(item.value)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                            statusFilter === item.value
                              ? 'bg-white text-slate-900 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Xóa bộ lọc</span>
                      </button>
                    )}
                  </div>
                </section>

                {/* Danh sách Gói đăng ký */}
                {subscriptions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
                    <CreditCard className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-slate-900">
                        Chưa có gói đăng ký nào trên máy
                      </h2>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Thêm gói đăng ký mới hoặc nạp 5 gói mẫu để xem thống kê chi phí và lịch nhắc hạn.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span>Thêm gói đăng ký</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSamplePackages}
                        className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-slate-600" aria-hidden="true" />
                        <span>Thêm 5 gói mẫu</span>
                      </button>
                    </div>
                  </div>
                ) : filteredSubscriptions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                    <ListFilter className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                    <h2 className="text-base font-bold text-slate-900">
                      Không tìm thấy gói phù hợp
                    </h2>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Không có gói đăng ký nào khớp với từ khóa hoặc bộ lọc hiện tại.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Xóa bộ lọc</span>
                    </button>
                  </div>
                ) : (
                  <div
                    data-testid="subscription-list"
                    className="space-y-2.5"
                  >
                    {filteredSubscriptions.map((sub) => {
                      const daysUntil = getDaysUntilBilling(sub.nextBillingDate, todayIso);
                      const monthlyEq = toMonthlyCost(sub.amount, sub.cycle);
                      const isDueSoon =
                        sub.status === 'active' && daysUntil >= 0 && daysUntil <= 7;
                      const resolvedTags = sub.tagIds
                        .map((id) => tagLookup.get(id))
                        .filter((t): t is Tag => Boolean(t));

                      return (
                        <div
                          key={sub.id}
                          className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(sub)}
                                  className="text-left text-sm sm:text-base font-bold text-slate-900 hover:text-blue-600 transition-colors focus:outline-none focus:underline"
                                >
                                  {sub.name}
                                </button>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                {sub.status === 'active' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Đang hoạt động</span>
                                  </span>
                                )}
                                {sub.status === 'paused' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                                    <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Tạm dừng</span>
                                  </span>
                                )}
                                {sub.status === 'cancelled' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Đã hủy</span>
                                  </span>
                                )}
                              </div>

                              {/* Unboxed metadata line */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                <span className="text-slate-700 font-medium">{sub.category}</span>
                                <span aria-hidden="true">·</span>
                                <span>{sub.platform}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`font-mono tabular-nums ${
                                    isDueSoon ? 'text-amber-700 font-semibold' : 'text-slate-600'
                                  }`}
                                >
                                  Kỳ tới: {formatDisplayDate(sub.nextBillingDate)}
                                  {sub.status === 'active' &&
                                    (daysUntil === 0
                                      ? ' (Hôm nay)'
                                      : daysUntil > 0
                                        ? ` (còn ${daysUntil} ngày)`
                                        : '')}
                                </span>

                                {resolvedTags.length > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-2">
                                      {resolvedTags.map((t) => (
                                        <span
                                          key={t.id}
                                          className="inline-flex items-center gap-1 text-slate-700 font-medium"
                                        >
                                          <span
                                            className="w-2 h-2 rounded-xs shrink-0"
                                            style={{ backgroundColor: t.color }}
                                            aria-hidden="true"
                                          />
                                          <span>{t.name}</span>
                                        </span>
                                      ))}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums">
                                {formatCurrency(sub.amount, sub.currency)}
                                <span className="text-[11px] font-normal text-slate-500 ml-1">
                                  /{CYCLE_LABELS[sub.cycle].replace('Hàng ', '')}
                                </span>
                              </div>
                              {sub.cycle !== 'monthly' && (
                                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  ≈ {formatCurrency(monthlyEq, sub.currency)}/tháng
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Action Row inside Card */}
                          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <select
                                aria-label={`Đổi trạng thái gói ${sub.name}`}
                                value={sub.status}
                                onChange={(e) =>
                                  handleQuickChangeStatus(
                                    sub.id,
                                    e.target.value as SubscriptionStatus
                                  )
                                }
                                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 focus:outline-none"
                              >
                                <option value="active">Đang hoạt động</option>
                                <option value="paused">Tạm dừng</option>
                                <option value="cancelled">Đã hủy</option>
                              </select>

                              {sub.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkCyclePaid(sub)}
                                  title="Đánh dấu đã thanh toán kỳ này và chuyển sang kỳ tiếp theo"
                                  className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Đã đóng kỳ này</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <a
                                href={generateGoogleCalendarUrl(sub)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Thêm lịch thanh toán ${sub.name} vào Lịch`}
                                title="Thêm sự kiện lặp lại vào Lịch Android (UC09)"
                                className="min-h-[34px] min-w-[34px] px-2 py-1 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>

                              {sub.managementUrl && (
                                <a
                                  href={sub.managementUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Mở trang quản lý ${sub.name}`}
                                  title="Mở liên kết quản lý gói"
                                  className="min-h-[34px] min-w-[34px] px-2 py-1 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(sub)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                              >
                                Chi tiết / Sửa
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BÁO CÁO CHI PHÍ (UC06 & UC10) */}
            {activeTab === 'reports' && (
              <ReportsView
                subscriptions={subscriptions}
                tags={tags}
                defaultCurrency={settings.defaultCurrency}
                autoConvertCurrency={settings.autoConvertCurrency}
                onToggleAutoConvertCurrency={(val) =>
                  handleUpdateSettings({ autoConvertCurrency: val })
                }
                onSelectSubscription={handleOpenEditModal}
                onNotifyToast={showToast}
              />
            )}

            {/* TAB 3: QUẢN LÝ TAG (UC07) */}
            {activeTab === 'tags' && (
              <TagsView
                tags={tags}
                subscriptions={subscriptions}
                defaultCurrency={settings.defaultCurrency}
                onCreateTag={handleCreateTag}
                onUpdateTag={handleUpdateTag}
                onDeleteTag={handleDeleteTag}
                onFilterByTag={(tagId) => {
                  setTagFilter(tagId);
                  setActiveTab('subscriptions');
                }}
              />
            )}

            {/* TAB 4: ĐỒNG BỘ ĐÁM MÂY FIREBASE (UC15) */}
            {activeTab === 'cloud' && (
              <CloudSyncView
                currentUser={currentUser}
                authLoading={authLoading}
                cloudSubCount={cloudSubCount}
                cloudTagCount={cloudTagCount}
                lastSyncedAt={lastSyncedAt}
                syncing={syncing}
                syncError={syncError}
                cloudAutoSync={settings.cloudAutoSync}
                localSubscriptions={subscriptions}
                localTags={tags}
                onSignInGoogle={handleSignInGoogle}
                onSignOut={handleSignOut}
                onPushLocalToCloud={handlePushLocalToCloud}
                onPullCloudToLocal={handlePullCloudToLocal}
                onToggleAutoSync={(enabled) =>
                  handleUpdateSettings({ cloudAutoSync: enabled })
                }
              />
            )}

            {/* TAB 5: CÀI ĐẶT ỨNG DỤNG (UC11, UC14, UC15) */}
            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                subscriptionCount={subscriptions.length}
                tagCount={tags.length}
                onUpdateSettings={handleUpdateSettings}
                onSendTestNotification={handleSendTestNotification}
                onAddSamplePackages={handleAddSamplePackages}
                onClearAllData={handleClearAllData}
                onOpenOnboarding={() => setShowOnboarding(true)}
                onOpenAndroidProject={() => setShowAndroidProjectModal(true)}
              />
            )}
          </main>

          {/* Material 3 NavigationBar at bottom of Android Phone Shell */}
          <nav
            aria-label="Thanh điều hướng Android"
            className="bg-white border-t border-slate-200 grid grid-cols-5 items-center h-16 px-1 shrink-0"
          >
            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              className={`flex flex-col items-center justify-center h-full rounded-xl text-[11px] font-medium transition-colors ${
                activeTab === 'subscriptions'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              <span className="mt-1">Gói đăng ký</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center justify-center h-full rounded-xl text-[11px] font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieChart className="w-4 h-4" aria-hidden="true" />
              <span className="mt-1">Báo cáo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`flex flex-col items-center justify-center h-full rounded-xl text-[11px] font-medium transition-colors ${
                activeTab === 'tags'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TagIcon className="w-4 h-4" aria-hidden="true" />
              <span className="mt-1">Tag</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={`flex flex-col items-center justify-center h-full rounded-xl text-[11px] font-medium transition-colors ${
                activeTab === 'cloud'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4" aria-hidden="true" />
              <span className="mt-1">Đám mây</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center h-full rounded-xl text-[11px] font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SettingsIcon className="w-4 h-4" aria-hidden="true" />
              <span className="mt-1">Cài đặt</span>
            </button>
          </nav>

          {/* Android 14 Bottom Gesture Handle Pill */}
          <div className="bg-white pb-2 pt-1 flex justify-center shrink-0">
            <div className="w-28 h-1 rounded-full bg-slate-300" />
          </div>
        </div>

        {/* Right Column on Desktop: Android Companion & Native Project Studio Panel */}
        {isPhoneFrameMode && (
          <aside
            aria-label="Bảng điều khiển ứng dụng Android"
            className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col gap-4 text-white sticky top-6"
          >
            {/* Card 1: Native Android Project & Standalone Install */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-emerald-400">
                    Android Native · Kotlin + Jetpack Compose
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    Ứng dụng Android SubTrack (UC01 – UC15)
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Trải nghiệm trực tiếp ứng dụng Android ở khung bên trái, cài đặt thẳng lên màn hình chính điện thoại hoặc tải trọn bộ mã nguồn Kotlin/Android Studio để xuất file .APK.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Smartphone className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAndroidProjectModal(true)}
                  className="min-h-[42px] px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Code2 className="w-4 h-4" aria-hidden="true" />
                  <span>Mã nguồn Android (.APK)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnboarding(true)}
                  className="min-h-[42px] px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  <span>Màn hình giới thiệu</span>
                </button>
              </div>

              {deferredInstallPrompt && (
                <button
                  type="button"
                  onClick={async () => {
                    await deferredInstallPrompt.prompt();
                    setDeferredInstallPrompt(null);
                  }}
                  className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Cài đặt App SubTrack lên thiết bị</span>
                </button>
              )}
            </div>

            {/* Card 2: Android WorkManager & Notification Simulator */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Tác nhân ngoài: Android WorkManager (UC14)
                </h3>
                <span className="text-xs font-mono text-emerald-400">
                  {settings.remindersEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kiểm tra các gói đang hoạt động có ngày thanh toán nằm trong khoảng nhắc hạn và phát thông báo trên Android (mỗi kỳ chỉ nhắc 1 lần).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerDueCheck(subscriptions, true);
                    setShowNotificationPanel(true);
                    showToast('WorkManager đã chạy kiểm tra nhắc hạn hằng ngày');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Chạy WorkManager kiểm tra ngay</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                  <span>Gửi thông báo thử</span>
                </button>
              </div>
            </div>

            {/* Card 3: Summary of All Implemented Suggested Features */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 space-y-2.5 text-xs text-slate-300">
              <div className="text-sm font-bold text-white">
                Các tính năng gợi ý & mở rộng đã hoàn thiện
              </div>
              <div className="space-y-1.5">
                <div>
                  1. <strong className="text-white">UC15 — Đồng bộ đám mây Firebase:</strong> Đăng nhập Google & đồng bộ thời gian thực với Cloud Firestore.
                </div>
                <div>
                  2. <strong className="text-white">Hạn mức ngân sách tháng:</strong> Cảnh báo trực quan khi chi phí vượt 80% hoặc 100% ngân sách.
                </div>
                <div>
                  3. <strong className="text-white">Quy đổi tỷ giá đa tiền tệ:</strong> Tuỳ chọn gộp các gói USD/EUR/JPY/GBP về tiền tệ báo cáo.
                </div>
                <div>
                  4. <strong className="text-white">Đánh dấu Đã đóng kỳ này:</strong> Tự động đẩy ngày thanh toán sang kỳ kế tiếp chỉ với 1 chạm.
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-4 sm:right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-medium border border-slate-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
            className="text-slate-400 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Modal Thêm / Sửa Gói đăng ký (UC02, UC03, UC04, UC08, UC09, UC12, UC13) */}
      {modalMode && (
        <SubscriptionFormModal
          mode={modalMode}
          initialData={editingSubscription}
          defaultCurrency={settings.defaultCurrency}
          todayIso={todayIso}
          tags={tags}
          onClose={() => {
            setModalMode(null);
            setEditingSubscription(null);
          }}
          onSave={handleSaveSubscription}
          onDelete={modalMode === 'edit' ? handleDeleteSubscription : undefined}
          onCreateTag={handleCreateTag}
          onNotifyToast={showToast}
        />
      )}

      {/* Onboarding Modal (Tiền điều kiện UC02) */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            setShowOnboarding(false);
            handleUpdateSettings({ hasCompletedOnboarding: true });
          }}
        />
      )}

      {/* Native Android Studio Source Code Modal */}
      {showAndroidProjectModal && (
        <AndroidProjectModal
          onClose={() => setShowAndroidProjectModal(false)}
          onNotifyToast={showToast}
        />
      )}
    </div>
  );
}
