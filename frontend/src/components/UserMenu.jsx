import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserProfileContext";

// ---------------------------------------------------------------------------
// User Menu Component (Header)
// ---------------------------------------------------------------------------
export default function UserMenu({ onProfile }) {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();

  if (!user) return null;

  const xp = profile?.xp || 0;
  const level = profile?.level || 1;
  const streak = profile?.streak || 0;
  const hearts = profile?.hearts || 3;

  return (
    <div className="relative">
      {/* User Button */}
      <button
        onClick={() => document.getElementById("user-dropdown")?.classList.toggle("hidden")}
        className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-sm">
          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-400">Lvl {level} • ⚡ {xp} XP</p>
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        id="user-dropdown"
        className="hidden absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50"
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Level</span>
            <span className="font-bold text-purple-600">{level}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
              style={{ width: `${(xp % 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">{xp % 100} / 100 XP</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-yellow-50">
            <p className="text-xl">🔥</p>
            <p className="font-bold text-yellow-700">{streak}</p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
          <div className="p-2 rounded-xl bg-rose-50">
            <p className="text-xl">❤️</p>
            <p className="font-bold text-rose-700">{hearts}</p>
            <p className="text-xs text-gray-500">Leben</p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-50">
            <p className="text-xl">⚡</p>
            <p className="font-bold text-indigo-700">{xp}</p>
            <p className="text-xs text-gray-500">XP</p>
          </div>
        </div>

        {onProfile && (
          <button
            onClick={() => {
              document.getElementById("user-dropdown")?.classList.add("hidden");
              onProfile();
            }}
            className="w-full px-4 py-2 text-left text-gray-700 font-medium hover:bg-gray-50 rounded-xl mx-2 mt-2 flex items-center gap-2"
          >
            👤 Profil
          </button>
        )}

        <button
          onClick={logout}
          className="w-full px-4 py-2 text-left text-red-600 font-medium hover:bg-red-50 rounded-xl mx-2 mt-2"
        >
          🚪 Abmelden
        </button>
      </div>
    </div>
  );
}