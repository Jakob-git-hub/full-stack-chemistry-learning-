import { useUserProfile } from "../context/UserProfileContext";
import AchievementBadge from "./AchievementBadge";

// ---------------------------------------------------------------------------
// Badge-Sammlung: alle Erfolge mit Fortschritt
// ---------------------------------------------------------------------------
export default function Badges() {
  const { getAchievements } = useUserProfile();
  const achievements = getAchievements();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Erfolge & Badges</h2>
          <p className="text-gray-500">
            Sammle Erfolge für deine Lernfortschritte.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
          <span className="text-indigo-600 font-bold">{unlockedCount}</span>
          <span className="text-indigo-500 text-sm">/ {totalCount}</span>
          <span className="text-xs text-indigo-500">freigeschaltet</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <AchievementBadge key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500">Keine Erfolge verfügbar.</p>
        </div>
      )}
    </div>
  );
}
