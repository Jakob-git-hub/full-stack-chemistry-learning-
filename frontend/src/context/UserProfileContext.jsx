import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Databases, Query, ID } from "appwrite";
import { databases, APPWRITE_CONFIG, client } from "../services/appwrite";

// ---------------------------------------------------------------------------
// User Profile Context - speichert XP, Streak, Hearts, Level, Erfolge, Lernverlauf
// ---------------------------------------------------------------------------
const UserProfileContext = createContext(null);

const PROFILE_COLLECTION_ID = APPWRITE_CONFIG.PROFILES_COLLECTION_ID;
const DEMO_STORAGE_KEY = "chemvibe_demo_profile";

// Prüfe ob Appwrite konfiguriert ist
const isAppwriteConfigured = client.config.project && client.config.project !== "";

// ---------------------------------------------------------------------------
// Standard-Profil (Demo-Modus / Neuanmeldung)
// ---------------------------------------------------------------------------
const defaultProfile = () => ({
  xp: 0,
  streak: 0,
  hearts: 3,
  level: 1,
  lastHeartRegen: null,
  lastLessonDate: null,
  completedLessons: [],
  streakFreeze: 0,
  dailyGoal: 50,
  settings: {
    sound: true,
    notifications: true,
    language: "de",
    demoMode: !isAppwriteConfigured,
  },
});

// ---------------------------------------------------------------------------
// Erfolge / Badges (Definition + Fortschritt berechnet aus Profil)
// ---------------------------------------------------------------------------
const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first-molecule",
    name: "Erstes Molekül",
    description: "Baue dein erstes Molekül erfolgreich auf.",
    icon: "🧪",
    category: "Chemie",
    criterion: { type: "lessons_completed", threshold: 1 },
  },
  {
    id: "organic-novice",
    name: "Organic Chemistry Novice",
    description: "Schließe 3 Lektionen der Kategorie Organische Chemie ab.",
    icon: "🌿",
    category: "Organische Chemie",
    criterion: { type: "category_completed", category: "Organic Chemistry", threshold: 3 },
  },
  {
    id: "streak-7",
    name: "7-Tage-Streak",
    description: "Halte einen Streak von 7 Tagen aufrecht.",
    icon: "🔥",
    category: "Streak",
    criterion: { type: "streak", threshold: 7 },
  },
  {
    id: "xp-100",
    name: "100 XP",
    description: "Sammle insgesamt 100 XP.",
    icon: "⚡",
    category: "XP",
    criterion: { type: "xp", threshold: 100 },
  },
  {
    id: "perfect-lesson",
    name: "Perfektionist",
    description: "Schließe eine Lektion mit 3 verbleibenden Herzen ab.",
    icon: "💎",
    category: "Herausforderung",
    criterion: { type: "perfect_lesson", threshold: 1 },
  },
];

export function UserProfileProvider({ children, user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------------------------------------------------------------------------
  // Demo-Modus: Profil aus localStorage laden / speichern
  // -------------------------------------------------------------------------
  const loadDemoProfile = useCallback(() => {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultProfile(), ...parsed };
      }
    } catch (err) {
      console.warn("Konnte Demo-Profil nicht aus localStorage lesen:", err);
    }
    return defaultProfile();
  }, []);

  const saveDemoProfile = useCallback((p) => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(p));
    } catch (err) {
      console.warn("Konnte Demo-Profil nicht in localStorage speichern:", err);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Profil laden oder erstellen
  // -------------------------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Demo-Modus: Kein Appwrite konfiguriert -> localStorage
    if (!isAppwriteConfigured) {
      setProfile(loadDemoProfile());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        PROFILE_COLLECTION_ID,
        [Query.equal("user_id", user.$id)]
      );

      if (response.documents.length > 0) {
        const doc = response.documents[0];
        const rawCompleted = doc.completed_lessons || [];
        // Backward-compat: alte String-Array-Formate in Objekt-Formate überführen
        const completedLessons = rawCompleted.map((entry) => {
          if (typeof entry === "string") {
            return { lessonId: entry, completedAt: doc.$createdAt || new Date().toISOString() };
          }
          return entry;
        });
        setProfile({
          id: doc.$id,
          userId: doc.user_id,
          xp: doc.xp || 0,
          streak: doc.streak || 0,
          hearts: doc.hearts || 3,
          level: doc.level || 1,
          lastHeartRegen: doc.last_heart_regen || null,
          lastLessonDate: doc.last_lesson_date || null,
          completedLessons,
          streakFreeze: doc.streak_freeze || 0,
          dailyGoal: doc.daily_goal || 50,
          settings: doc.settings || defaultProfile().settings,
        });
      } else {
        const newProfile = await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          PROFILE_COLLECTION_ID,
          ID.unique(),
          {
            user_id: user.$id,
            xp: 0,
            streak: 0,
            hearts: 3,
            level: 1,
            completed_lessons: [],
            streak_freeze: 0,
            daily_goal: 50,
            settings: defaultProfile().settings,
          }
        );
        setProfile({
          id: newProfile.$id,
          userId: newProfile.user_id,
          xp: 0,
          streak: 0,
          hearts: 3,
          level: 1,
          lastHeartRegen: null,
          lastLessonDate: null,
          completedLessons: [],
          streakFreeze: 0,
          dailyGoal: 50,
          settings: defaultProfile().settings,
        });
      }
      setError(null);
    } catch (err) {
      console.error("Fehler beim Laden des Profils:", err);
      setError("Profil konnte nicht geladen werden");
      setProfile(isAppwriteConfigured ? defaultProfile() : loadDemoProfile());
    } finally {
      setLoading(false);
    }
  }, [user, isAppwriteConfigured, loadDemoProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // -------------------------------------------------------------------------
  // Profil aktualisieren (Appwrite oder localStorage)
  // -------------------------------------------------------------------------
  const updateProfile = useCallback(async (updates) => {
    if (!profile) return null;

    const next = { ...profile, ...updates };

    // Demo-Modus: lokal speichern
    if (!isAppwriteConfigured) {
      saveDemoProfile(next);
      setProfile(next);
      return next;
    }

    if (!profile.id) return null;

    try {
      const mapped = {};
      for (const [key, value] of Object.entries(updates)) {
        const dbKey =
          key === "completedLessons" ? "completed_lessons"
          : key === "lastHeartRegen" ? "last_heart_regen"
          : key === "lastLessonDate" ? "last_lesson_date"
          : key === "streakFreeze" ? "streak_freeze"
          : key === "dailyGoal" ? "daily_goal"
          : key === "settings" ? "settings"
          : key;
        mapped[dbKey] = value;
      }
      const updated = await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        PROFILE_COLLECTION_ID,
        profile.id,
        mapped
      );
      setProfile((prev) => ({ ...prev, ...updates }));
      return updated;
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Profils:", err);
      setError("Profil konnte nicht aktualisiert werden");
      throw err;
    }
  }, [profile, isAppwriteConfigured, saveDemoProfile]);

  // -------------------------------------------------------------------------
  // XP hinzufügen + Level berechnen (Level = floor(XP / 100) + 1)
  // -------------------------------------------------------------------------
  const addXp = useCallback(async (amount) => {
    if (!profile) return;
    const newXp = (profile.xp || 0) + amount;
    const newLevel = Math.floor(newXp / 100) + 1;
    const leveledUp = newLevel > (profile.level || 1);
    await updateProfile({ xp: newXp, level: newLevel });
    return { newXp, newLevel, leveledUp };
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Streak erhöhen (einmal pro Kalendertag)
  // -------------------------------------------------------------------------
  const incrementStreak = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastLessonDate === today) {
      return; // Bereits heute erhöht
    }
    const newStreak = (profile.streak || 0) + 1;
    await updateProfile({ streak: newStreak, lastLessonDate: today });
    return newStreak;
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Herz verlieren
  // -------------------------------------------------------------------------
  const loseHeart = useCallback(async () => {
    if (!profile) return;
    const newHearts = Math.max(0, (profile.hearts || 3) - 1);
    await updateProfile({ hearts: newHearts });
    return newHearts;
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Herzen regenerieren (alle 30 Min 1 Herz, max 3)
  // -------------------------------------------------------------------------
  const regenerateHearts = useCallback(async () => {
    if (!profile) return;
    const now = Date.now();
    const lastRegen = profile.lastHeartRegen ? new Date(profile.lastHeartRegen).getTime() : 0;
    const minutesSinceRegen = (now - lastRegen) / (1000 * 60);
    const heartsToAdd = Math.floor(minutesSinceRegen / 30);

    if (heartsToAdd > 0 && (profile.hearts || 3) < 3) {
      const newHearts = Math.min(3, (profile.hearts || 3) + heartsToAdd);
      await updateProfile({
        hearts: newHearts,
        last_heart_regen: new Date().toISOString(),
      });
    }
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Lektion als abgeschlossen markieren (Objekt-Format mit Score/XP/Hearts)
  // -------------------------------------------------------------------------
  const completeLesson = useCallback(
    async (lessonId, xpReward = 30, score = 100, heartsRemaining = 3, lessonTitle = "", lessonCategory = "") => {
      if (!profile) return;
      const completed = profile.completedLessons || [];
      const already = completed.find((e) => e.lessonId === lessonId);
      const entry = {
        lessonId,
        title: lessonTitle,
        category: lessonCategory,
        completedAt: new Date().toISOString(),
        score,
        xpEarned: xpReward,
        heartsRemaining,
      };
      const updatedCompleted = already
        ? completed.map((e) => (e.lessonId === lessonId ? entry : e))
        : [...completed, entry];

      await updateProfile({ completedLessons: updatedCompleted });
      const xpResult = await addXp(xpReward);
      await incrementStreak();
      return { ...xpResult, lessonEntry: entry };
    },
    [profile, updateProfile, addXp, incrementStreak]
  );

  // -------------------------------------------------------------------------
  // Prüfen ob Lektion abgeschlossen (rückwärtskompatibel zu String-Array)
  // -------------------------------------------------------------------------
  const isLessonCompleted = useCallback((lessonId) => {
    if (!profile) return false;
    return (profile.completedLessons || []).some(
      (e) => (typeof e === "string" ? e : e.lessonId) === lessonId
    );
  }, [profile]);

  // -------------------------------------------------------------------------
  // Ergebnis einer abgeschlossenen Lektion abrufen
  // -------------------------------------------------------------------------
  const getLessonResult = useCallback((lessonId) => {
    if (!profile) return null;
    return (profile.completedLessons || []).find(
      (e) => (typeof e === "string" ? e : e.lessonId) === lessonId
    );
  }, [profile]);

  // -------------------------------------------------------------------------
  // Alle Erfolge mit Fortschritt berechnen
  // -------------------------------------------------------------------------
  const getAchievements = useCallback(() => {
    if (!profile) return [];
    const completed = profile.completedLessons || [];
    const completedCount = completed.length;
    const xp = profile.xp || 0;
    const streak = profile.streak || 0;

    const categoryCounts = {};
    let perfectLessons = 0;
    completed.forEach((e) => {
      const cat = typeof e === "string" ? null : e.category;
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (typeof e !== "string" && (e.heartsRemaining || 0) >= 3) perfectLessons++;
    });

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      let progress = 0;
      let maxProgress = def.criterion.threshold;
      let unlocked = false;

      switch (def.criterion.type) {
        case "lessons_completed":
          progress = Math.min(completedCount, def.criterion.threshold);
          unlocked = completedCount >= def.criterion.threshold;
          break;
        case "category_completed":
          progress = Math.min(categoryCounts[def.criterion.category] || 0, def.criterion.threshold);
          unlocked = (categoryCounts[def.criterion.category] || 0) >= def.criterion.threshold;
          break;
        case "streak":
          progress = Math.min(streak, def.criterion.threshold);
          unlocked = streak >= def.criterion.threshold;
          break;
        case "xp":
          progress = Math.min(xp, def.criterion.threshold);
          unlocked = xp >= def.criterion.threshold;
          break;
        case "perfect_lesson":
          progress = Math.min(perfectLessons, def.criterion.threshold);
          unlocked = perfectLessons >= def.criterion.threshold;
          break;
        default:
          progress = 0;
          unlocked = false;
      }

      return {
        ...def,
        unlocked,
        progress,
        maxProgress,
      };
    });
  }, [profile]);

  // -------------------------------------------------------------------------
  // Streak Freeze aktivieren (schützt Streak bei verpasstem Tag)
  // -------------------------------------------------------------------------
  const activateStreakFreeze = useCallback(async () => {
    if (!profile) return;
    if ((profile.streakFreeze || 0) > 0) {
      await updateProfile({ streakFreeze: (profile.streakFreeze || 0) - 1 });
    }
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Tagesziel-Fortschritt
  // -------------------------------------------------------------------------
  const getDailyGoalProgress = useCallback(() => {
    if (!profile) return { current: 0, target: 50, pct: 0 };
    const target = profile.dailyGoal || 50;
    const today = new Date().toISOString().slice(0, 10);
    const todayXp = (profile.completedLessons || [])
      .filter((e) => typeof e !== "string" && e.completedAt && e.completedAt.slice(0, 10) === today)
      .reduce((sum, e) => sum + (e.xpEarned || 0), 0);
    const pct = target > 0 ? Math.round(Math.min((todayXp / target) * 100, 100)) : 0;
    return { current: todayXp, target, pct };
  }, [profile]);

  // -------------------------------------------------------------------------
  // Einstellungen aktualisieren
  // -------------------------------------------------------------------------
  const updateSettings = useCallback(async (settings) => {
    if (!profile) return;
    const nextSettings = { ...(profile.settings || {}), ...settings };
    await updateProfile({ settings: nextSettings });
    return nextSettings;
  }, [profile, updateProfile]);

  const value = {
    profile,
    loading,
    error,
    addXp,
    incrementStreak,
    loseHeart,
    regenerateHearts,
    completeLesson,
    isLessonCompleted,
    getLessonResult,
    getAchievements,
    activateStreakFreeze,
    getDailyGoalProgress,
    updateSettings,
    refresh: loadProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile muss innerhalb eines UserProfileProvider verwendet werden");
  }
  return context;
}
