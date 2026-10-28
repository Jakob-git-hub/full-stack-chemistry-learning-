import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Databases, Query, ID } from "appwrite";
import { databases, APPWRITE_CONFIG, client } from "../services/appwrite";

// ---------------------------------------------------------------------------
// User Profile Context - speichert XP, Streak, Hearts, Level pro User
// ---------------------------------------------------------------------------
const UserProfileContext = createContext(null);

const PROFILE_COLLECTION_ID = APPWRITE_CONFIG.PROFILES_COLLECTION_ID; // user_profiles Collection

// Prüfe ob Appwrite konfiguriert ist
const isAppwriteConfigured = client.config.project && client.config.project !== "";

export function UserProfileProvider({ children, user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------------------------------------------------------------------------
  // Profil laden oder erstellen
  // -------------------------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Demo-Modus: Kein Appwrite konfiguriert
    if (!isAppwriteConfigured) {
      setProfile({
        xp: 0,
        streak: 0,
        hearts: 3,
        level: 1,
        completedLessons: [],
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Suche nach existierendem Profil
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        PROFILE_COLLECTION_ID,
        [Query.equal("user_id", user.$id)]
      );

      if (response.documents.length > 0) {
        const doc = response.documents[0];
        setProfile({
          id: doc.$id,
          userId: doc.user_id,
          xp: doc.xp || 0,
          streak: doc.streak || 0,
          hearts: doc.hearts || 3,
          level: doc.level || 1,
          lastHeartRegen: doc.last_heart_regen || null,
          completedLessons: doc.completed_lessons || [],
        });
      } else {
        // Neues Profil erstellen
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
          completedLessons: [],
        });
      }
      setError(null);
    } catch (err) {
      console.error("Fehler beim Laden des Profils:", err);
      setError("Profil konnte nicht geladen werden");
      // Fallback auf lokale Werte
      setProfile({
        xp: 0,
        streak: 0,
        hearts: 3,
        level: 1,
        completedLessons: [],
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // -------------------------------------------------------------------------
  // Profil aktualisieren
  // -------------------------------------------------------------------------
  const updateProfile = useCallback(async (updates) => {
    if (!profile || !profile.id) return;

    // Demo-Modus: lokal aktualisieren ohne Appwrite
    if (!isAppwriteConfigured) {
      setProfile((prev) => ({ ...prev, ...updates }));
      return { ...profile, ...updates };
    }

    try {
      const updated = await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        PROFILE_COLLECTION_ID,
        profile.id,
        updates
      );
      setProfile((prev) => ({ ...prev, ...updated }));
      return updated;
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Profils:", err);
      setError("Profil konnte nicht aktualisiert werden");
      throw err;
    }
  }, [profile]);

  // -------------------------------------------------------------------------
  // XP hinzufügen
  // -------------------------------------------------------------------------
  const addXp = useCallback(async (amount) => {
    if (!profile) return;
    const newXp = (profile.xp || 0) + amount;
    const newLevel = Math.floor(newXp / 100) + 1;
    await updateProfile({ xp: newXp, level: newLevel });
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Streak erhöhen
  // -------------------------------------------------------------------------
  const incrementStreak = useCallback(async () => {
    if (!profile) return;
    await updateProfile({ streak: (profile.streak || 0) + 1 });
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
  // Herz regenerieren (alle 30 Min 1 Herz, max 5)
  // -------------------------------------------------------------------------
  const regenerateHearts = useCallback(async () => {
    if (!profile) return;
    const now = Date.now();
    const lastRegen = profile.lastHeartRegen ? new Date(profile.lastHeartRegen).getTime() : 0;
    const minutesSinceRegen = (now - lastRegen) / (1000 * 60);
    const heartsToAdd = Math.floor(minutesSinceRegen / 30);

    if (heartsToAdd > 0 && (profile.hearts || 3) < 5) {
      const newHearts = Math.min(5, (profile.hearts || 3) + heartsToAdd);
      await updateProfile({
        hearts: newHearts,
        last_heart_regen: new Date().toISOString(),
      });
    }
  }, [profile, updateProfile]);

  // -------------------------------------------------------------------------
  // Lektion als abgeschlossen markieren
  // -------------------------------------------------------------------------
  const completeLesson = useCallback(async (lessonId, xpReward = 30) => {
    if (!profile) return;
    const completed = profile.completedLessons || [];
    if (!completed.includes(lessonId)) {
      await updateProfile({
        completed_lessons: [...completed, lessonId],
      });
      await addXp(xpReward);
      await incrementStreak();
    }
  }, [profile, updateProfile, addXp, incrementStreak]);

  // -------------------------------------------------------------------------
  // Prüfen ob Lektion abgeschlossen
  // -------------------------------------------------------------------------
  const isLessonCompleted = useCallback((lessonId) => {
    if (!profile) return false;
    return (profile.completedLessons || []).includes(lessonId);
  }, [profile]);

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