import { useState, useCallback, useEffect } from "react";
import { useUserProfile } from "../context/UserProfileContext";
import LessonHistory from "./LessonHistory";
import AchievementBadge from "./AchievementBadge";
import XPBar from "./XPBar";

// ---------------------------------------------------------------------------
// Profil-Bereich (Übersicht, Verlauf, Erfolge, Einstellungen)
// ---------------------------------------------------------------------------
export default function Profile({ allLessons = [], onRetryLesson, onBack }) {
  const {
    profile,
    loading,
    getAchievements,
    getDailyGoalProgress,
    regenerateHearts,
    updateSettings,
    updateProfile,
  } = useUserProfile();

  const [tab, setTab] = useState("overview");
  const [settings, setSettings] = useState({
    sound: true,
    notifications: true,
    language: "de",
    demoMode: true,
    theme: "warm",
  });
  const [resetConfirm, setResetConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (profile) {
      setSettings((prev) => ({ ...prev, ...(profile.settings || {}) }));
    }
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleToggleDemo = useCallback(async () => {
    await updateSettings({ demoMode: !settings.demoMode });
    setSettings((prev) => ({ ...prev, demoMode: !prev.demoMode }));
  }, [settings.demoMode, updateSettings]);

  const handleSettingChange = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  }, [updateSettings]);

  const handleExport = useCallback(() => {
    const data = {
      app: "ChemVibe",
      exportedAt: new Date().toISOString(),
      profile: { ...profile, settings },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chemvibe-profil-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: "Profil wurde exportiert", type: "success" });
  }, [profile, settings]);

  const handleReset = useCallback(async () => {
    if (!profile) return;
    await updateProfile({
      xp: 0,
      streak: 0,
      hearts: 3,
      level: 1,
      completedLessons: [],
    });
    setResetConfirm(false);
    setToast({ message: "Fortschritt wurde zurückgesetzt", type: "success" });
  }, [profile, updateProfile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Lade Profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const xp = profile.xp ?? 0;
  const level = profile.level ?? 1;
  const streak = profile.streak ?? 0;
  const hearts = profile.hearts ?? 3;
  const completedLessons = profile.completedLessons ?? [];
  const completedCount = completedLessons.length;
  const totalXpEarned = completedLessons.reduce(
    (sum, e) => sum + (typeof e === "string" ? 0 : e.xpEarned || 0),
    0
  );
  const dailyGoal = getDailyGoalProgress();

  const initials = (profile.userId || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const recentActivity = completedLessons
    .filter((e) => typeof e !== "string" && e.completedAt)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, 5);

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getUnlockDate = (achievement) => {
    const completed = completedLessons
      .filter((e) => typeof e !== "string" && e.completedAt)
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    if (completed.length === 0 || !achievement.criterion) return null;
    const { type, threshold } = achievement.criterion;
    switch (type) {
      case "lessons_completed":
        return completed[threshold - 1]?.completedAt || null;
      case "category_completed": {
        const cat = completed.filter(
          (e) => e.category === achievement.criterion.category
        );
        return cat[threshold - 1]?.completedAt || null;
      }
      case "perfect_lesson": {
        const perfect = completed.filter((e) => (e.heartsRemaining || 0) >= 3);
        return perfect[0]?.completedAt || null;
      }
      case "xp": {
        let sum = 0;
        for (const entry of completed) {
          sum += entry.xpEarned || 0;
          if (sum >= threshold) return entry.completedAt;
        }
        return null;
      }
      case "streak":
        return profile.lastLessonDate || null;
      default:
        return null;
    }
  };

  const tabs = [
    { id: "overview", label: "Übersicht", icon: "👤" },
    { id: "history", label: "Verlauf", icon: "📜" },
    { id: "badges", label: "Erfolge", icon: "🏆" },
    { id: "settings", label: "Einstellungen", icon: "⚙️" },
  ];

  const heartsRegenMinutes = 30;

  // -------------------------------------------------------------------------
  // Design-Thema (warme Pastell-Farbtöne)
  // -------------------------------------------------------------------------
  const THEMES = [
    { id: "warm", label: "Bernstein", icon: "🌅", color: "amber" },
    { id: "rose", label: "Rose", icon: "🌸", color: "rose" },
    { id: "indigo", label: "Indigo", icon: "🌙", color: "indigo" },
    { id: "emerald", label: "Emerald", icon: "🌿", color: "emerald" },
  ];

  const THEME_CLASSES = {
    warm: {
      gradient: "from-amber-400 via-orange-400 to-rose-500",
      button: "bg-amber-500 text-white border-amber-500 shadow-sm",
      tab: "bg-amber-600 text-white shadow-sm",
    },
    rose: {
      gradient: "from-rose-400 via-fuchsia-500 to-rose-600",
      button: "bg-rose-500 text-white border-rose-500 shadow-sm",
      tab: "bg-rose-600 text-white shadow-sm",
    },
    indigo: {
      gradient: "from-indigo-400 via-purple-500 to-indigo-600",
      button: "bg-indigo-500 text-white border-indigo-500 shadow-sm",
      tab: "bg-indigo-600 text-white shadow-sm",
    },
    emerald: {
      gradient: "from-emerald-400 via-teal-400 to-emerald-600",
      button: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
      tab: "bg-emerald-600 text-white shadow-sm",
    },
  };
  const theme = THEME_CLASSES[settings.theme] || THEME_CLASSES.warm;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-gray-200 bg-white text-gray-800">
          {toast.type === "success" && <span className="text-emerald-600">✅</span>}
          {toast.type === "error" && <span className="text-rose-600">⚠️</span>}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
            title="Zurück zum Lernpfad"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-rose-400/30 bg-gradient-to-br ${theme.gradient}`}>
              {initials}
            </div>
            <div>
              <h1 className="font-bold text-sm text-gray-800">ChemVibe</h1>
              <p className="text-xs text-gray-500">Profil & Fortschritt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold text-sm">❤️ {hearts}</span>
            <span className="text-indigo-600 font-bold text-sm">⚡ {xp}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 sm:px-4 sm:py-16">
        {/* Tab-Navigation */}
        <div className="flex overflow-x-auto gap-1 border-b border-gray-200 mb-8 pb-2 -mx-6 sm:-mx-0 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? theme.tab : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ============ ÜBERSICHT ============ */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Profil-Karte */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-rose-400/30 bg-gradient-to-br ${theme.gradient}`}>
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{profile.userId || "ChemVibe-Nutzer"}</h2>
                    <p className="text-indigo-600 font-semibold text-sm">Level {level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right hidden sm:block">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">XP</p>
                    <p className="text-2xl font-bold text-gray-800">{xp}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
                    <p className="text-2xl font-bold text-yellow-600">🔥 {streak}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Leben</p>
                    <p className="text-2xl font-bold text-rose-600">❤️ {hearts}</p>
                  </div>
                </div>
              </div>

              {/* XP-Bar */}
              <XPBar level={level} xp={xp} />

              {/* Tagesziel */}
              <div className="mt-6 p-5 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🎯</span>
                  <h3 className="font-bold text-gray-800">Tagesziel</h3>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-1000"
                    style={{ width: `${dailyGoal.pct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{dailyGoal.current} / {dailyGoal.target} XP heute</span>
                  <span>{dailyGoal.pct}%</span>
                </div>
              </div>

              {/* Kurz-Statistiken */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Abgeschlossene Lektionen" value={completedCount} icon="📖" />
                <StatCard label="Gesamt-XP" value={totalXpEarned} icon="⚡" />
                <StatCard label="Aktueller Streak" value={streak} icon="🔥" />
                <StatCard label="Verbleibende Leben" value={hearts} icon="❤️" />
              </div>

              {/* Letzte Aktivität */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">Letzte Aktivität</h3>
                  <button
                    onClick={() => setTab("history")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Verlauf anzeigen →
                  </button>
                </div>
                {recentActivity.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
                    <span className="text-3xl mb-3 block">📖</span>
                    <p className="text-gray-500 text-sm">
                      Noch keine Aktivitäten. Schließe deine erste Lektion ab!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((entry) => {
                      const scoreColor =
                        entry.score >= 80
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-amber-100 text-amber-700 border-amber-200";
                      return (
                        <div
                          key={entry.lessonId}
                          className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-white border border-gray-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {entry.title || "Lektion"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {entry.category || "—"} • {formatDate(entry.completedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${scoreColor}`}
                            >
                              {entry.score} Punkte
                            </span>
                            <span className="text-xs font-bold text-indigo-600">
                              +{entry.xpEarned} XP
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Herzen-Regen-Timer */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">⏳</span>
                <h3 className="font-bold text-gray-800">Leben regenerieren</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Deine Leben regenerieren sich automatisch alle {heartsRegenMinutes} Minuten (max. 3).
              </p>
              <button
                onClick={regenerateHearts}
                className="px-5 py-2.5 rounded-xl font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition"
              >
                🔄 Jetzt prüfen
              </button>
              {hearts < 3 && (
                <p className="mt-3 text-xs text-gray-400 italic">
                  Tipp: Nach {heartsRegenMinutes} Minuten ohne Lektion erhältst du ein neues Leben.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============ VERLAUF ============ */}
        {tab === "history" && (
          <LessonHistory allLessons={allLessons} onRetry={onRetryLesson} />
        )}

        {/* ============ ERFOLGE ============ */}
        {tab === "badges" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Erfolge & Badges</h2>
                <p className="text-gray-500">
                  Sammle Erfolge für deine Lernfortschritte.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <span className="text-indigo-600 font-bold">
                  {getAchievements().filter((a) => a.unlocked).length}
                </span>
                <span className="text-indigo-500 text-sm">/ {getAchievements().length}</span>
                <span className="text-xs text-indigo-500">freigeschaltet</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getAchievements().map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  unlockedAt={getUnlockDate(achievement)}
                />
              ))}
            </div>
            {getAchievements().length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500">Keine Erfolge verfügbar.</p>
              </div>
            )}
          </div>
        )}

        {/* ============ EINSTELLUNGEN ============ */}
        {tab === "settings" && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Einstellungen</h2>

              {/* Appwrite / Demo-Modus */}
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-gray-50 mb-6">
                <h3 className="font-bold text-gray-800 mb-2">Appwrite-Verbindung</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Demo-Modus ist {settings.demoMode ? "aktiv" : "inaktiv"}. Im Demo-Modus werden
                  Fortschritte lokal im Browser gespeichert.
                </p>
                <button
                  onClick={handleToggleDemo}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${settings.demoMode ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100"}`}
                >
                  {settings.demoMode ? "Zum Appwrite-Modus wechseln" : "Zum Demo-Modus wechseln"}
                </button>
                <p className="mt-2 text-xs text-gray-400 italic">
                  Hinweis: Ein Wechsel erfordert eine neu konfigurierte Appwrite-Instanz.
                </p>
              </div>

              {/* Erscheinungsbild */}
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-gray-50 mb-6">
                <h3 className="font-bold text-gray-800 mb-3">Erscheinungsbild</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Wähle deinen Lieblings-Farbton für die App.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSettingChange("theme", t.id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        settings.theme === t.id ? theme.button : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Einstellungen */}
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-gray-50 mb-6">
                <h3 className="font-bold text-gray-800 mb-3">App-Einstellungen</h3>
                <div className="space-y-3">
                  <SettingRow
                    label="Sound"
                    description="Töne und Feedback aktivieren"
                    checked={settings.sound}
                    onChange={(v) => handleSettingChange("sound", v)}
                  />
                  <SettingRow
                    label="Benachrichtigungen"
                    description="Erinnerungen an tägliches Lernen"
                    checked={settings.notifications}
                    onChange={(v) => handleSettingChange("notifications", v)}
                  />
                  <SettingRow
                    label="Sprache"
                    description="Anzeigesprache der App"
                    checked={settings.language === "de"}
                    onChange={(v) => handleSettingChange("language", v ? "de" : "en")}
                  />
                </div>
              </div>

              {/* Daten */}
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800 mb-3">Daten</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition"
                  >
                    📥 Profil exportieren
                  </button>
                  {resetConfirm ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                      <p className="text-sm text-rose-800 mb-4">
                        Wirklich alles zurücksetzen? XP, Lernverlauf und Erfolge werden gelöscht.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReset}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition"
                        >
                          Ja, zurücksetzen
                        </button>
                        <button
                          onClick={() => setResetConfirm(false)}
                          className="px-4 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-300 font-semibold hover:bg-gray-100 transition"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResetConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-semibold hover:bg-rose-100 transition"
                    >
                      🗑️ Fortschritt zurücksetzen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kleine Statistik-Karte
// ---------------------------------------------------------------------------
function StatCard({ label, value, icon }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-200 text-center">
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Einstellungs-Zeile (Toggle)
// ---------------------------------------------------------------------------
function SettingRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative inline-flex w-11 h-6 shrink-0 rounded-full border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
