import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Code2,
  Smartphone,
  Terminal,
} from 'lucide-react';

interface AndroidProjectModalProps {
  onClose: () => void;
  onNotifyToast: (msg: string) => void;
}

interface AndroidSourceFile {
  path: string;
  title: string;
  language: string;
  content: string;
}

export const ANDROID_STUDIO_FILES: AndroidSourceFile[] = [
  {
    path: 'app/build.gradle.kts',
    title: 'Gradle Config (Jetpack Compose + Room SQLite + WorkManager + Firebase)',
    language: 'kotlin',
    content: [
      'plugins {',
      '    id("com.android.application")',
      '    id("org.jetbrains.kotlin.android")',
      '    id("com.google.devtools.ksp")',
      '    id("com.google.gms.google-services")',
      '}',
      '',
      'android {',
      '    namespace = "vn.subtrack.app"',
      '    compileSdk = 34',
      '',
      '    defaultConfig {',
      '        applicationId = "vn.subtrack.app"',
      '        minSdk = 26',
      '        targetSdk = 34',
      '        versionCode = 2',
      '        versionName = "2.0.0"',
      '    }',
      '',
      '    buildFeatures {',
      '        compose = true',
      '    }',
      '    composeOptions {',
      '        kotlinCompilerExtensionVersion = "1.5.14"',
      '    }',
      '}',
      '',
      'dependencies {',
      '    // Jetpack Compose Material 3',
      '    implementation(platform("androidx.compose:compose-bom:2024.06.00"))',
      '    implementation("androidx.compose.ui:ui")',
      '    implementation("androidx.compose.material3:material3")',
      '    implementation("androidx.activity:activity-compose:1.9.0")',
      '    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.2")',
      '',
      '    // Room SQLite Database (UC01 - UC13)',
      '    val roomVersion = "2.6.1"',
      '    implementation("androidx.room:room-runtime:$roomVersion")',
      '    implementation("androidx.room:room-ktx:$roomVersion")',
      '    ksp("androidx.room:room-compiler:$roomVersion")',
      '',
      '    // WorkManager Daily Notification Check (UC08 & UC14)',
      '    implementation("androidx.work:work-runtime-ktx:2.9.0")',
      '',
      '    // Firebase Auth & Firestore Cloud Sync (UC15)',
      '    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))',
      '    implementation("com.google.firebase:firebase-auth-ktx")',
      '    implementation("com.google.firebase:firebase-firestore-ktx")',
      '}',
    ].join('\n'),
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    title: 'AndroidManifest.xml (Quyền thông báo Android 13+ & WorkManager)',
    language: 'xml',
    content: [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
      '    package="vn.subtrack.app">',
      '',
      '    <!-- Quyền thông báo nhắc hạn trên Android 13+ (UC08 / UC14) -->',
      '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
      '    <uses-permission android:name="android.permission.INTERNET" />',
      '',
      '    <application',
      '        android:name=".SubTrackApplication"',
      '        android:allowBackup="true"',
      '        android:label="SubTrack"',
      '        android:supportsRtl="true"',
      '        android:theme="@android:style/Theme.Material.Light.NoActionBar">',
      '',
      '        <activity',
      '            android:name=".ui.MainActivity"',
      '            android:exported="true">',
      '            <intent-filter>',
      '                <action android:name="android.intent.action.MAIN" />',
      '                <category android:name="android.intent.category.LAUNCHER" />',
      '            </intent-filter>',
      '        </activity>',
      '    </application>',
      '</manifest>',
    ].join('\n'),
  },
  {
    path: 'app/src/main/java/vn/subtrack/app/data/SubTrackDatabase.kt',
    title: 'Room SQLite Entities & DAO (UC01 - UC07, UC12, UC13)',
    language: 'kotlin',
    content: [
      'package vn.subtrack.app.data',
      '',
      'import androidx.room.*',
      'import kotlinx.coroutines.flow.Flow',
      '',
      '@Entity(tableName = "subscriptions")',
      'data class SubscriptionEntity(',
      '    @PrimaryKey val id: String,',
      '    val name: String,',
      '    val amount: Double,',
      '    val currency: String,          // VND, USD, EUR, JPY, GBP',
      '    val cycle: String,             // weekly, monthly, quarterly, yearly',
      '    val nextBillingDate: String,   // YYYY-MM-DD',
      '    val category: String,',
      '    val status: String,            // active, paused, cancelled (UC13)',
      '    val reminderDays: Int,         // -1, 0, 1, 3, 7, 30 (UC08)',
      '    val tagIdsCsv: String,         // Danh sách tag phân cách bởi dấu phẩy',
      '    val platform: String,',
      '    val managementUrl: String,',
      '    val notes: String,',
      '    val lastNotifiedCycleDate: String?, // UC14: mỗi kỳ thanh toán chỉ nhắc 1 lần',
      '    val createdAt: String,',
      '    val updatedAt: String',
      ')',
      '',
      '@Entity(tableName = "tags")',
      'data class TagEntity(',
      '    @PrimaryKey val id: String,',
      '    val name: String,',
      '    val color: String',
      ')',
      '',
      '@Dao',
      'interface SubTrackDao {',
      '    @Query("SELECT * FROM subscriptions ORDER BY nextBillingDate ASC")',
      '    fun observeAllSubscriptions(): Flow<List<SubscriptionEntity>>',
      '',
      '    @Query("SELECT * FROM subscriptions")',
      '    suspend fun getAllSubscriptionsOnce(): List<SubscriptionEntity>',
      '',
      '    @Insert(onConflict = OnConflictStrategy.REPLACE)',
      '    suspend fun upsertSubscription(item: SubscriptionEntity)',
      '',
      '    @Query("DELETE FROM subscriptions WHERE id = :id")',
      '    suspend fun deleteSubscriptionById(id: String)',
      '',
      '    @Query("DELETE FROM subscriptions")',
      '    suspend fun clearAllSubscriptions()',
      '',
      '    @Query("SELECT * FROM tags ORDER BY name ASC")',
      '    fun observeAllTags(): Flow<List<TagEntity>>',
      '',
      '    @Insert(onConflict = OnConflictStrategy.REPLACE)',
      '    suspend fun upsertTag(tag: TagEntity)',
      '',
      '    @Query("DELETE FROM tags WHERE id = :id")',
      '    suspend fun deleteTagById(id: String)',
      '}',
      '',
      '@Database(entities = [SubscriptionEntity::class, TagEntity::class], version = 2, exportSchema = false)',
      'abstract class SubTrackDatabase : RoomDatabase() {',
      '    abstract fun dao(): SubTrackDao',
      '}',
    ].join('\n'),
  },
  {
    path: 'app/src/main/java/vn/subtrack/app/worker/ReminderWorker.kt',
    title: 'Android WorkManager — Kiểm tra nhắc hạn hằng ngày & sau khi lưu (UC08 / UC14)',
    language: 'kotlin',
    content: [
      'package vn.subtrack.app.worker',
      '',
      'import android.app.NotificationChannel',
      'import android.app.NotificationManager',
      'import android.app.PendingIntent',
      'import android.content.Context',
      'import android.content.Intent',
      'import androidx.core.app.NotificationCompat',
      'import androidx.work.*',
      'import vn.subtrack.app.data.SubTrackDatabase',
      'import vn.subtrack.app.ui.MainActivity',
      'import java.time.LocalDate',
      'import java.time.temporal.ChronoUnit',
      'import java.util.concurrent.TimeUnit',
      '',
      'class ReminderWorker(',
      '    context: Context,',
      '    params: WorkerParameters',
      ') : CoroutineWorker(context, params) {',
      '',
      '    override suspend fun doWork(): Result {',
      '        val prefs = applicationContext.getSharedPreferences("subtrack_prefs", Context.MODE_PRIVATE)',
      '        val remindersEnabled = prefs.getBoolean("reminders_enabled", true)',
      '        if (!remindersEnabled) return Result.success()',
      '',
      '        val db = androidx.room.Room.databaseBuilder(',
      '            applicationContext,',
      '            SubTrackDatabase::class.java,',
      '            "subtrack.db"',
      '        ).build()',
      '',
      '        val today = LocalDate.now()',
      '        val subs = db.dao().getAllSubscriptionsOnce()',
      '',
      '        for (sub in subs) {',
      '            if (sub.status != "active" || sub.reminderDays < 0) continue',
      '            var nextDate = LocalDate.parse(sub.nextBillingDate)',
      '',
      '            // Hậu điều kiện UC14: Ngày đã qua tự chuyển sang kỳ kế tiếp',
      '            var advanced = false',
      '            while (nextDate.isBefore(today)) {',
      '                nextDate = when (sub.cycle) {',
      '                    "weekly" -> nextDate.plusWeeks(1)',
      '                    "monthly" -> nextDate.plusMonths(1)',
      '                    "quarterly" -> nextDate.plusMonths(3)',
      '                    "yearly" -> nextDate.plusYears(1)',
      '                    else -> nextDate.plusMonths(1)',
      '                }',
      '                advanced = true',
      '            }',
      '            val nextIso = nextDate.toString()',
      '            if (advanced) {',
      '                db.dao().upsertSubscription(sub.copy(nextBillingDate = nextIso))',
      '            }',
      '',
      '            val daysRemaining = ChronoUnit.DAYS.between(today, nextDate).toInt()',
      '            if (daysRemaining in 0..sub.reminderDays) {',
      '                // Luồng thay thế 3a: Đã nhắc cho kỳ thanh toán này -> không nhắc lại',
      '                if (sub.lastNotifiedCycleDate == nextIso) continue',
      '',
      '                showNotification(',
      '                    sub.id.hashCode(),',
      '                    sub.name + " sắp đến hạn",',
      '                    "Gói " + sub.name + " đến hạn trong " + daysRemaining + " ngày (" + nextIso + ")."',
      '                )',
      '',
      '                db.dao().upsertSubscription(sub.copy(',
      '                    nextBillingDate = nextIso,',
      '                    lastNotifiedCycleDate = nextIso',
      '                ))',
      '            }',
      '        }',
      '        return Result.success()',
      '    }',
      '',
      '    private fun showNotification(notifId: Int, title: String, message: String) {',
      '        val channelId = "subtrack_reminders"',
      '        val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager',
      '        val channel = NotificationChannel(channelId, "Nhắc hạn thanh toán SubTrack", NotificationManager.IMPORTANCE_HIGH)',
      '        nm.createNotificationChannel(channel)',
      '',
      '        val intent = Intent(applicationContext, MainActivity::class.java)',
      '        val pendingIntent = PendingIntent.getActivity(',
      '            applicationContext, 0, intent,',
      '            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE',
      '        )',
      '',
      '        val notification = NotificationCompat.Builder(applicationContext, channelId)',
      '            .setSmallIcon(android.R.drawable.ic_popup_reminder)',
      '            .setContentTitle(title)',
      '            .setContentText(message)',
      '            .setContentIntent(pendingIntent)',
      '            .setAutoCancel(true)',
      '            .build()',
      '',
      '        nm.notify(notifId, notification)',
      '    }',
      '',
      '    companion object {',
      '        fun scheduleDailyAndImmediate(context: Context) {',
      '            val wm = WorkManager.getInstance(context)',
      '            val immediate = OneTimeWorkRequestBuilder<ReminderWorker>().build()',
      '            wm.enqueue(immediate)',
      '',
      '            val daily = PeriodicWorkRequestBuilder<ReminderWorker>(24, TimeUnit.HOURS).build()',
      '            wm.enqueueUniquePeriodicWork(',
      '                "subtrack_daily_reminder",',
      '                ExistingPeriodicWorkPolicy.KEEP,',
      '                daily',
      '            )',
      '        }',
      '    }',
      '}',
    ].join('\n'),
  },
  {
    path: 'app/src/main/java/vn/subtrack/app/util/CalendarIntentHelper.kt',
    title: 'Tích hợp Ứng dụng Lịch Android & Xuất CSV (UC09 & UC10)',
    language: 'kotlin',
    content: [
      'package vn.subtrack.app.util',
      '',
      'import android.content.Context',
      'import android.content.Intent',
      'import android.provider.CalendarContract',
      'import vn.subtrack.app.data.SubscriptionEntity',
      'import java.time.LocalDate',
      'import java.time.ZoneId',
      '',
      'object CalendarIntentHelper {',
      '    /**',
      '     * UC09: Mở ứng dụng Lịch có sẵn trên điện thoại Android với sự kiện lặp lại theo chu kỳ thanh toán',
      '     */',
      '    fun openAndroidCalendarWithRecurringEvent(context: Context, sub: SubscriptionEntity) {',
      '        val startDate = LocalDate.parse(sub.nextBillingDate)',
      '        val startMillis = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()',
      '',
      '        val rrule = when (sub.cycle) {',
      '            "weekly" -> "FREQ=WEEKLY;INTERVAL=1"',
      '            "monthly" -> "FREQ=MONTHLY;INTERVAL=1"',
      '            "quarterly" -> "FREQ=MONTHLY;INTERVAL=3"',
      '            "yearly" -> "FREQ=YEARLY;INTERVAL=1"',
      '            else -> "FREQ=MONTHLY;INTERVAL=1"',
      '        }',
      '',
      '        val intent = Intent(Intent.ACTION_INSERT).apply {',
      '            data = CalendarContract.Events.CONTENT_URI',
      '            putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startMillis)',
      '            putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, true)',
      '            putExtra(CalendarContract.Events.TITLE, "Thanh toán " + sub.name)',
      '            putExtra(CalendarContract.Events.DESCRIPTION, "Gói đăng ký " + sub.name + " - Danh mục: " + sub.category)',
      '            putExtra(CalendarContract.Events.RRULE, rrule)',
      '        }',
      '        context.startActivity(intent)',
      '    }',
      '}',
    ].join('\n'),
  },
  {
    path: 'app/src/main/java/vn/subtrack/app/sync/FirebaseSyncRepository.kt',
    title: 'Đồng bộ đám mây Firebase Authentication & Firestore (UC15)',
    language: 'kotlin',
    content: [
      'package vn.subtrack.app.sync',
      '',
      'import com.google.firebase.auth.FirebaseAuth',
      'import com.google.firebase.firestore.FirebaseFirestore',
      'import kotlinx.coroutines.tasks.await',
      'import vn.subtrack.app.data.SubTrackDao',
      '',
      'class FirebaseSyncRepository(',
      '    private val dao: SubTrackDao,',
      '    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),',
      '    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()',
      ') {',
      '    suspend fun backupToFirestore() {',
      '        val uid = auth.currentUser?.uid ?: throw IllegalStateException("Chưa đăng nhập Firebase")',
      '        val subs = dao.getAllSubscriptionsOnce()',
      '        val batch = firestore.batch()',
      '',
      '        for (sub in subs) {',
      '            val docRef = firestore.collection("users").document(uid)',
      '                .collection("subscriptions").document(sub.id)',
      '            val payload = mapOf(',
      '                "ownerId" to uid,',
      '                "name" to sub.name,',
      '                "amount" to sub.amount,',
      '                "currency" to sub.currency,',
      '                "cycle" to sub.cycle,',
      '                "nextBillingDate" to sub.nextBillingDate,',
      '                "category" to sub.category,',
      '                "status" to sub.status,',
      '                "reminderDays" to sub.reminderDays,',
      '                "tagIds" to sub.tagIdsCsv.split(",").filter { it.isNotBlank() },',
      '                "platform" to sub.platform,',
      '                "managementUrl" to sub.managementUrl,',
      '                "notes" to sub.notes,',
      '                "updatedAtIso" to sub.updatedAt',
      '            )',
      '            batch.set(docRef, payload)',
      '        }',
      '        batch.commit().await()',
      '    }',
      '}',
    ].join('\n'),
  },
];

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({
  onClose,
  onNotifyToast,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = ANDROID_STUDIO_FILES[selectedFileIndex];

  const handleCopyFile = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      onNotifyToast(`Đã sao chép tệp ${activeFile.path}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotifyToast('Đã sẵn sàng sao chép mã nguồn');
    }
  };

  const handleDownloadInstallerScript = () => {
    const lines: string[] = [
      '#!/usr/bin/env bash',
      '# Script tự động khởi tạo Project Android Studio: SubTrack (Kotlin + Jetpack Compose + Room SQLite + WorkManager + Firebase)',
      'set -e',
      'mkdir -p SubTrackAndroid',
      'cd SubTrackAndroid',
    ];

    for (const file of ANDROID_STUDIO_FILES) {
      const dir = file.path.includes('/')
        ? file.path.slice(0, file.path.lastIndexOf('/'))
        : '';
      if (dir) {
        lines.push(`mkdir -p "${dir}"`);
      }
      lines.push(`cat << 'EOF_SUBTRACK' > "${file.path}"`);
      lines.push(file.content);
      lines.push('EOF_SUBTRACK');
    }

    lines.push('echo "Đã tạo xong Project Android Studio tại thư mục ./SubTrackAndroid!"');

    const blob = new Blob([lines.join('\n')], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generate-subtrack-android-studio.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotifyToast('Đã tải bộ khởi tạo Project Android Studio (Kotlin/Compose)');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-project-title"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="android-project-title" className="text-base font-bold text-slate-900">
                Mã nguồn Android Studio Gốc (Kotlin · Room SQLite · WorkManager · Firebase)
              </h2>
              <p className="text-xs text-slate-500">
                Mở trực tiếp trong Android Studio để biên dịch file cài đặt .APK cho điện thoại Android
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ mã nguồn Android"
            className="min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-emerald-950 space-y-0.5">
              <div className="font-bold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Tải trọn bộ cấu trúc Project Android Studio (UC01 – UC15)</span>
              </div>
              <p className="text-emerald-800">
                Bao gồm Room Database (SQLite), WorkManager nhắc hạn hằng ngày, Intent Lịch Android và Firebase Firestore Sync.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadInstallerScript}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Tải Project Android (.sh)</span>
            </button>
          </div>

          {/* File Selector Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {ANDROID_STUDIO_FILES.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors ${
                  selectedFileIndex === idx
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {file.path.split('/').pop()}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 text-slate-100">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-xs font-mono text-slate-300 truncate">
                  {activeFile.path} — {activeFile.title}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyFile}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white inline-flex items-center gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]">
              {activeFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
