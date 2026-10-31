import { useState } from "react";
import { useUserProfile } from "../context/UserProfileContext";

// ---------------------------------------------------------------------------
// Lektionsverlauf: abgeschlossene Lektionen mit Datum, Score, XP, Zeit
// ---------------------------------------------------------------------------
export default function LessonHistory({ allLessons = [], onRetry }) {
  const { profile } = useUserProfile();
  const [filterCategory, setFilterCategory] = useState("all");

  const categories = [
    "all",
    ...new Set(allLessons.map((l) => l.category).filter(Boolean)),
  ];

  const completed = (profile?.completedLessons || [])
    .map((entry) => {
      const lesson = allLessons.find((l) => l.id === entry.lessonId);
      return { ...entry, lesson };
    })
    .filter((entry) => entry.lesson)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  const filtered =
    filterCategory === "all"
      ? completed
      : completed.filter((entry) => entry.lesson.category === filterCategory);

  const totalXp = completed.reduce(
    (sum, e) => sum + (e.xpEarned || 0),
    0
  );
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, e) => sum + (e.score || 0), 0) /
            completed.length
        )
      : 0;
  const totalTimeSeconds = completed.reduce(
    (sum, e) => sum + (e.timeSpentSeconds || 0),
    0
  );

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "—";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0
      ? `${minutes} Min${secs > 0 ? ` ${secs} Sek` : ""}`
      : `${secs} Sek`;
  };

  if (completed.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 text-4xl">
          📖
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Noch keine Lektionen abgeschlossen
        </h2>
        <p className="text-gray-500 mb-6">
          Schließe deine erste Lektion ab, um deinen Fortschritt hier zu sehen.
        </p>
        {allLessons.length > 0 && (
          <button
            onClick={() => onRetry && onRetry(allLessons[0])}
            className="px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Erste Lektion starten
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Abgeschlossene Lektionen" value={completed.length} icon="📖" />
        <StatCard label="Durchschnittlicher Score" value={avgScore} icon="🎯" />
        <StatCard label="Gesamt-XP" value={totalXp} icon="⚡" />
        <StatCard label="Gesamt-Lernzeit" value={formatTime(totalTimeSeconds)} icon="⏱️" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {cat === "all" ? "Alle" : cat}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {filtered.map((entry) => {
          const lesson = entry.lesson;
          return (
            <div
              key={entry.lessonId}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      entry.score >= 80
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {entry.score} Punkte
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(entry.completedAt)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800">{lesson.title}</h3>
                <p className="text-sm text-gray-500">
                  {lesson.category} • +{entry.xpEarned} XP • ❤️{" "}
                  {entry.heartsRemaining} Leben • ⏱️ {formatTime(
                    entry.timeSpentSeconds
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500">
                  Abgeschlossen
                </span>
                <button
                  onClick={() => onRetry && onRetry(lesson)}
                  className="px-4 py-2 rounded-xl font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100"
                >
                  Wiederholen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && completed.length > 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500 text-sm">
            Keine Lektionen in dieser Kategorie gefunden.
          </p>
        </div>
      )}
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
