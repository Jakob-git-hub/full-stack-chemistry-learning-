import { useState, useCallback, useEffect } from "react";
import { useUserProfile } from "../context/UserProfileContext";
import { client } from "../services/appwrite";

// ---------------------------------------------------------------------------
// Einstellungen – Vollbildansicht (Duolingo-Stil)
// ---------------------------------------------------------------------------
const THEMES = [
  {
    id: "light",
    name: "Hell",
    description: "Helles, freundliches Design für den Tag",
    colors: ["#e5e7eb", "#d1fae5"],
    dot: "bg-indigo-500",
  },
  {
    id: "dark",
    name: "Dunkel",
    description: "Augenschonender Dunkelmodus für abends",
    colors: ["#1e1b4b", "#451a03"],
    dot: "bg-rose-500",
  },
  {
    id: "warm",
    name: "Warm (Pergament)",
    description: "Warme, papierähnliche Optik wie ein Notizbuch",
    colors: ["#fef3c7", "#ffe4e6"],
    dot: "bg-amber-500",
  },
];

export default function Settings({ onBack }) {
  const { profile, loading, updateSettings, updateProfile } = useUserProfile();
  const isAppwriteConfigured = Boolean(
    client.config.project && client.config.project !== ""
  );
  const demoModeDefault = !isAppwriteConfigured;

  const [theme, setTheme] = useState(profile?.settings?.theme || "light");
  const [sound, setSound] = useState(profile?.settings?.sound ?? true);
  const [notifications, setNotifications] = useState(
    profile?.settings?.notifications ?? true
  );
  const [language, setLanguage] = useState(profile?.settings?.language || "de");
  const [demoMode, setDemoMode] = useState(
    profile?.settings?.demoMode ?? demoModeDefault
  );
  const [saving, setSaving] = useState(false);

  // Theme sofort anwenden (data-theme + localStorage)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("chemvibe_theme", theme);
  }, [theme]);

  const isDemo = demoMode || !isAppwriteConfigured;

  const handleSettingChange = useCallback(
    async (key, value) => {
      setSaving(true);
      try {
        await updateSettings({ [key]: value });
      } finally {
        setSaving(false);
      }
    },
    [updateSettings]
  );

  const handleResetProgress = useCallback(async () => {
    if (
      !window.confirm(
        "Deinen gesamten Fortschritt zurücksetzen? XP, Streak, Level und Lernverlauf werden gelöscht und können nicht wiederhergestellt werden."
      )
    ) {
      return;
    }
    try {
      await updateProfile({
        xp: 0,
        streak: 0,
        hearts: 3,
        level: 1,
        completedLessons: [],
        lastLessonDate: null,
      });
      window.alert("Fortschritt wurde zurückgesetzt.");
    } catch (err) {
      console.error("Fehler beim Zurücksetzen:", err);
      window.alert("Zurücksetzen fehlgeschlagen.");
    }
  }, [updateProfile]);

  const handleExportData = useCallback(() => {
    if (!profile) return;
    const data = JSON.stringify(profile, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chemvibe-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [profile]);

  const handleDeleteDemoData = useCallback(() => {
    if (
      !window.confirm(
        "Alle lokalen Demo-Daten löschen? Damit startest du komplett von vorne."
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem("chemvibe_demo_profile");
      localStorage.removeItem("chemvibe_theme");
      setDemoMode(false);
      setTheme("light");
      setSound(true);
      setNotifications(true);
      setLanguage("de");
      window.alert("Demo-Daten wurden gelöscht. Die Seite wird neu geladen.");
      window.location.reload();
    } catch (err) {
      console.error("Fehler beim Löschen der Demo-Daten:", err);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Lade Einstellungen...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              title="Zurück zum Lernpfad"
            >
              ←
            </button>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <div>
              <h1 className="font-bold text-sm text-gray-800">ChemVibe</h1>
              <p className="text-xs text-gray-500">Einstellungen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold text-sm">❤️ {profile.hearts ?? 3}</span>
            <span className="text-indigo-600 font-bold text-sm">⚡ {profile.xp ?? 0}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Einstellungen</h2>
            <p className="text-gray-500">
              Passe ChemVibe an deine Lerngewohnheiten an.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2.5 rounded-2xl border border-indigo-100 shadow-sm">
            <span className="text-indigo-600 font-bold">
              {profile.level ?? 1}
            </span>
            <span className="text-indigo-500 text-sm">Level</span>
          </div>
        </div>

        {/* Erscheinung */}
        <SettingsSection title="Erscheinung" description="Wähle dein Farbthema.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    handleSettingChange("theme", t.id);
                  }}
                  className={`rounded-2xl p-4 border transition-all ${
                    active
                      ? "border-indigo-600 bg-indigo-50 shadow-sm ring-2 ring-indigo-600/20"
                      : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-8 h-8 rounded-full ${t.dot} shadow-sm`} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {active ? "Aktiv" : "Verfügbar"}
                    </span>
                  </div>
                  <h3 className={`font-bold text-gray-800 ${active ? "text-indigo-600" : ""}`}>
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden border border-gray-200">
                    <div
                      className="h-full"
                      style={{
                        background: `linear-gradient(to right, ${t.colors[0]}, ${t.colors[1]})`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* Benachrichtigungen */}
        <SettingsSection title="Benachrichtigungen" description="Lern-Erinnerungen und Feedback.">
          <SettingRow
            label="Sound"
            description="Töne und Feedback aktivieren"
            checked={sound}
            onChange={(v) => {
              setSound(v);
              handleSettingChange("sound", v);
            }}
          />
          <SettingRow
            label="Benachrichtigungen"
            description="Erinnerungen an tägliches Lernen"
            checked={notifications}
            onChange={(v) => {
              setNotifications(v);
              handleSettingChange("notifications", v);
            }}
          />
          <SettingRow
            label="Sprache"
            description="Anzeigesprache der App"
            checked={language === "de"}
            onChange={(v) => {
              setLanguage(v ? "de" : "en");
              handleSettingChange("language", v ? "de" : "en");
            }}
          />
        </SettingsSection>

        {/* Konto */}
        <SettingsSection title="Konto" description="Dein Profil und deine Daten.">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-200">
              <div>
                <p className="font-semibold text-gray-800">Benutzer</p>
                <p className="text-sm text-gray-500 truncate max-w-xs">
                  {profile.userId || "ChemVibe-Nutzer"}
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                {isDemo ? "Demo-Modus" : "Appwrite"}
              </span>
            </div>

            <SettingRow
              label="Demo-Modus"
              description={
                isDemo
                  ? "Fortschritte werden lokal im Browser gespeichert."
                  : "Fortschritte werden in Appwrite gespeichert."
              }
              checked={demoMode}
              onChange={(v) => {
                setDemoMode(v);
                handleSettingChange("demoMode", v);
              }}
            />

            <div className="pt-4">
              <button
                onClick={handleResetProgress}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 transition"
              >
                🗑️ Fortschritt zurücksetzen
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition"
              >
                📥 Daten exportieren (JSON)
              </button>
            </div>

            {!isAppwriteConfigured && (
              <div className="pt-2">
                <button
                  onClick={handleDeleteDemoData}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-gray-500 border border-gray-200 bg-gray-50 hover:bg-gray-100 transition"
                >
                  🧹 Alle Demo-Daten löschen
                </button>
                <p className="mt-2 text-xs text-gray-400 text-center">
                  Im Demo-Modus werden alle Daten im lokalen Browser-Speicher
                  gehalten.
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Status */}
        <SettingsSection title="Appwrite-Status" description="Verbindung zur Cloud-Datenbank.">
          <div className="p-4 rounded-2xl border flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isAppwriteConfigured ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <div>
              <p className="font-semibold text-gray-800">
                {isAppwriteConfigured ? "Verbunden" : "Demo-Modus aktiv"}
              </p>
              <p className="text-xs text-gray-500">
                {isAppwriteConfigured
                  ? "Dein Fortschritt wird sicher in der Cloud gespeichert."
                  : "Ohne Appwrite-Konfiguration wird der Demo-Modus verwendet."}
              </p>
            </div>
          </div>
        </SettingsSection>

        <div className="mt-10 text-center">
          <p className="text-xs text-gray-400">
            ChemVibe • Organische Chemie spielerisch lernen
          </p>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Einstellungs-Abschnitt (Karte)
// ---------------------------------------------------------------------------
function SettingsSection({ children, title, description }) {
  return (
    <div className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Einstellungs-Zeile (Toggle)
// ---------------------------------------------------------------------------
function SettingRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
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
