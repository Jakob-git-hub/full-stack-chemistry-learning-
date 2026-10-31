import { useState } from "react";
import { useUserProfile } from "../context/UserProfileContext";
import AchievementBadge from "./AchievementBadge";

// ---------------------------------------------------------------------------
// Erfolge & Badges – Vollbildansicht (Duolingo-Stil)
// ---------------------------------------------------------------------------
export default function Badges({ onBack }) {
  const { profile, getAchievements } = useUserProfile();
  const achievements = getAchievements();
  const [filterCategory, setFilterCategory] = useState("all");

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const level = profile?.level ?? 1;

  const categories = [
    "all",
    ...new Set(achievements.map((a) => a.category)),
  ];

  const filtered =
    filterCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === filterCategory);

  // Nächster freizuschaltender Erfolg (höchster Fortschritt, noch gesperrt)
  const nextBadge = [...achievements]
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progress - a.progress)[0];

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
              <p className="text-xs text-gray-500">Erfolge & Badges</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold text-sm">❤️ {profile?.hearts ?? 3}</span>
            <span className="text-indigo-600 font-bold text-sm">⚡ {xp}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Erfolge & Badges</h2>
            <p className="text-gray-500">
              Sammle Erfolge für deine Lernfortschritte und sieh deinen
              Fortschritt zum nächsten Badge.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2.5 rounded-2xl border border-indigo-100 shadow-sm">
            <span className="text-indigo-600 font-bold text-lg">{unlockedCount}</span>
            <span className="text-indigo-500 text-sm">/ {totalCount}</span>
            <span className="text-xs text-indigo-500">freigeschaltet</span>
          </div>
        </div>

        {/* Kurz-Statistiken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Freigeschaltet" value={unlockedCount} icon="🏆" />
          <StatCard label="Gesamt-XP" value={xp} icon="⚡" />
          <StatCard label="Streak" value={streak} icon="🔥" />
          <StatCard label="Level" value={level} icon="📊" />
        </div>

        {/* Nächster Erfolg im Fokus */}
        {nextBadge && (
          <div className="mb-8 rounded-3xl p-6 shadow-sm relative overflow-hidden border border-indigo-100 bg-gradient-to-r from-indigo-50 to-amber-50">
            <div className="absolute top-0 right-0 p-6 opacity-10 select-none">
              <span className="text-6xl">🔒</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center text-3xl grayscale">
                {nextBadge.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">Nächster Erfolg</h3>
                <p className="text-gray-600 text-sm">
                  {nextBadge.name} – {nextBadge.description}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{nextBadge.category}</span>
                    <span>{nextBadge.progress} / {nextBadge.maxProgress}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                      style={{ width: `${nextBadge.progress / nextBadge.maxProgress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                Bald frei
              </span>
            </div>
          </div>
        )}

        {/* Kategorie-Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat === "all" ? "Alle" : cat}
            </button>
          ))}
        </div>

        {/* Badge-Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 text-4xl">
              🏆
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Keine Erfolge in dieser Kategorie
            </h3>
            <p className="text-gray-500">Versuche eine andere Kategorie.</p>
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
    <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-indigo-600">{value}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}
