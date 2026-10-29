// ---------------------------------------------------------------------------
// XP-Bar: Fortschritt zum nächsten Level (100 XP pro Level)
// ---------------------------------------------------------------------------
export default function XPBar({ level, xp }) {
  const xpForNextLevel = (level * 100) - xp;
  const levelPct = Math.round(((xp % 100) / 100) * 100);

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
        <span>Level {level}</span>
        <span>{xpForNextLevel} XP bis Level {level + 1}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000"
          style={{ width: `${levelPct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{levelPct}% zum nächsten Level</p>
    </div>
  );
}
