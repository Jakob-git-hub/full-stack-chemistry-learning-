// ---------------------------------------------------------------------------
// Einzelnes Achievement-Badge (gesperrt / freigeschaltet)
// ---------------------------------------------------------------------------
export default function AchievementBadge({ achievement }) {
  const {
    unlocked,
    progress,
    maxProgress,
    icon,
    name,
    description,
    category,
  } = achievement;
  const pct = maxProgress > 0 ? Math.round((progress / maxProgress) * 100) : 0;

  return (
    <div
      className={`w-full rounded-2xl p-5 border transition-all duration-300 ${
        unlocked
          ? "bg-white border-emerald-200 shadow-sm"
          : "bg-gray-50 border-gray-200 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            unlocked ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-400"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            unlocked ? "text-emerald-600" : "text-gray-400"
          }`}
        >
          {category}
        </span>
      </div>

      <h3 className={`font-bold text-lg mb-1 ${
        unlocked ? "text-gray-800" : "text-gray-500"
      }`}>
        {unlocked ? name : `🔒 ${name}`}
      </h3>
      <p className={`text-sm mb-4 leading-relaxed ${
        unlocked ? "text-gray-600" : "text-gray-400"
      }`}>
        {description}
      </p>

      {/* Fortschrittsbalken */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
        <div
          className={`h-full ${
            unlocked ? "bg-emerald-500" : "bg-gray-300"
          } transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{progress} / {maxProgress}</span>
        <span>{pct}%</span>
      </div>

      {!unlocked && (
        <p className="mt-2 text-xs text-gray-400 italic">
          Noch nicht freigeschaltet.
        </p>
      )}
    </div>
  );
}
