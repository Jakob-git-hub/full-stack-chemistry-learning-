// ---------------------------------------------------------------------------
// Kategorie-Karte für den Skill-Tree mit Fortschrittsanzeige
// ---------------------------------------------------------------------------
export default function CategoryCard({ category, lessons, completedCount, onClick }) {
  const total = lessons.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all cursor-pointer p-6 group"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {category}
        </span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
          {category.slice(0, 1).toUpperCase()}
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
        {category}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {total} Lektionen • {completedCount} abgeschlossen
      </p>

      {/* Fortschrittsbalken */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{pct}%</span>
        <span>{completedCount} / {total}</span>
      </div>
    </div>
  );
}
