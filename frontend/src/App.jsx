import { useState, useEffect, useCallback, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserProfileProvider, useUserProfile } from "./context/UserProfileContext";
import MoleculeBuilder from "./components/MoleculeBuilder";
import LessonInProgress from "./components/LessonInProgress";
import LessonResult from "./components/LessonResult";
import Profile from "./components/Profile";
import Badges from "./components/Badges";
import Settings from "./components/Settings";
import LessonHistory from "./components/LessonHistory";
import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./components/AdminLogin";
import AuthForm from "./components/AuthForm";
import UserMenu from "./components/UserMenu";
import { fetchPublishedLessons } from "./services/appwrite";

// ---------------------------------------------------------------------------
// Gespeichertes Farbthema sofort anwenden (vor dem ersten Rendern,
// um einen Blend-Effekt beim Thema-Wechsel zu vermeiden)
// ---------------------------------------------------------------------------
const savedTheme = localStorage.getItem("chemvibe_theme");
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
}

// ---------------------------------------------------------------------------
// Demo-Daten als Fallback (falls Appwrite nicht konfiguriert ist)
// ---------------------------------------------------------------------------
const DEMO_LESSONS = [
  {
    id: "demo-1",
    title: "Methan aufbauen",
    category: "Organic Chemistry",
    theory: "Methan (CH₄) ist das einfachste Alkan. Es besteht aus einem Kohlenstoffatom, das mit vier Wasserstoffatomen verbunden ist.\n\n💡 Wusstest du schon? Methan ist der Hauptbestandteil von Erdgas und ein starkes Treibhausgas.",
    challenge: {
      type: "molecule_builder",
      question: "Baue Methan (CH₄) – ein Kohlenstoff mit vier Wasserstoffen.",
      difficulty: "easy",
      target_smiles: "C",
      target_atoms: [
        { type: "carbon", x: 350, y: 250 },
        { type: "hydrogen", x: 350, y: 150 },
        { type: "hydrogen", x: 450, y: 250 },
        { type: "hydrogen", x: 350, y: 350 },
        { type: "hydrogen", x: 250, y: 250 },
      ],
      target_bonds: 4,
      preplaced_atoms: [{ type: "carbon", x: 350, y: 250 }],
      palette_atoms: [
        { type: "carbon", symbol: "C", name: "Kohlenstoff" },
        { type: "hydrogen", symbol: "H", name: "Wasserstoff" },
      ],
    },
    status: "published",
  },
  {
    id: "demo-2",
    title: "Methanol aufbauen",
    category: "Organic Chemistry",
    theory: "Methanol (CH₃OH) ist der einfachste Alkohol. Es hat eine Hydroxygruppe (-OH) an einem Kohlenstoff.\n\n💡 Wusstest du schon? Methanol wird auch als Holzalkohol bezeichnet und ist die einfachste Form von Alkohol.",
    challenge: {
      type: "molecule_builder",
      question: "Baue Methanol (CH₃OH) – füge eine Hydroxygruppe an Methan an.",
      difficulty: "medium",
      target_smiles: "CO",
      target_atoms: [
        { type: "carbon", x: 300, y: 250 },
        { type: "oxygen", x: 400, y: 250 },
        { type: "hydrogen", x: 240, y: 210 },
        { type: "hydrogen", x: 240, y: 290 },
        { type: "hydrogen", x: 360, y: 210 },
        { type: "hydrogen", x: 440, y: 290 },
      ],
      target_bonds: 5,
      preplaced_atoms: [{ type: "carbon", x: 300, y: 250 }],
      palette_atoms: [
        { type: "carbon", symbol: "C", name: "Kohlenstoff" },
        { type: "hydrogen", symbol: "H", name: "Wasserstoff" },
        { type: "oxygen", symbol: "O", name: "Sauerstoff" },
      ],
    },
    status: "published",
  },
  {
    id: "demo-3",
    title: "Ethen aufbauen",
    category: "Organic Chemistry",
    theory: "Ethen (C₂H₄) ist das einfachste Alken mit einer Doppelbindung zwischen zwei Kohlenstoffatomen.\n\n💡 Wusstest du schon? Ethen wird als Pflanzenhormon verwendet und reift Früchte nach.",
    challenge: {
      type: "molecule_builder",
      question: "Baue Ethen (C₂H₄) – zwei Kohlenstoffe mit einer Doppelbindung.",
      difficulty: "hard",
      target_smiles: "C=C",
      target_atoms: [
        { type: "carbon", x: 300, y: 250 },
        { type: "carbon", x: 400, y: 250 },
        { type: "hydrogen", x: 240, y: 210 },
        { type: "hydrogen", x: 240, y: 290 },
        { type: "hydrogen", x: 460, y: 210 },
        { type: "hydrogen", x: 460, y: 290 },
      ],
      target_bonds: 7,
      preplaced_atoms: [],
      palette_atoms: [
        { type: "carbon", symbol: "C", name: "Kohlenstoff" },
        { type: "hydrogen", symbol: "H", name: "Wasserstoff" },
      ],
    },
    status: "published",
  },
];

// ---------------------------------------------------------------------------
// Inner App Component (mit Auth)
// ---------------------------------------------------------------------------
function InnerApp() {
  const { user, loading: authLoading } = useAuth();

  // Loading state for auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Prüfe Anmeldung...</p>
        </div>
      </div>
    );
  }

  return (
    <UserProfileProvider user={user}>
      <InnerAppContent />
    </UserProfileProvider>
  );
}

function InnerAppContent() {
  const { user } = useAuth();
  const {
    profile,
    loading: profileLoading,
    completeLesson,
    isLessonCompleted,
  } = useUserProfile();

  // -------------------------------------------------------------------------
  // State (alle Hooks vor frühen Returns, damit React-Hooks-Regeln eingehalten werden)
  // -------------------------------------------------------------------------
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  const [view, setView] = useState("skilltree"); // 'skilltree' | 'lesson-in-progress' | 'lesson-result' | 'profile' | 'auth'
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState("login"); // 'login' | 'dashboard'
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'register'
  const [lessonResult, setLessonResult] = useState(null); // { xpReward, score, heartsRemaining }
  const [lessonKey, setLessonKey] = useState(0);
  const [lessonError, setLessonError] = useState(null);
  const [lessonStartedAt, setLessonStartedAt] = useState(null); // Zeitstempel des Lektions-Starts

  const adminKeyRef = useRef({ ctrl: false, shift: false, a: false });

  // -------------------------------------------------------------------------
  // Admin Dashboard mit Tastenkombination öffnen (Ctrl+Shift+A)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Control") adminKeyRef.current.ctrl = true;
      if (e.key === "Shift") adminKeyRef.current.shift = true;
      if (e.key.toLowerCase() === "a") adminKeyRef.current.a = true;
      if (adminKeyRef.current.ctrl && adminKeyRef.current.shift && adminKeyRef.current.a) {
        if (isAdmin) {
          setShowAdmin(true);
        } else {
          setAdminMode("login");
          setShowAdmin(true);
        }
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === "Control") adminKeyRef.current.ctrl = false;
      if (e.key === "Shift") adminKeyRef.current.shift = false;
      if (e.key.toLowerCase() === "a") adminKeyRef.current.a = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Lektionen laden (aus Appwrite oder Demo-Fallback)
  // -------------------------------------------------------------------------
  const loadLessons = useCallback(async () => {
    setLessonsLoading(true);
    try {
      const published = await fetchPublishedLessons();
      if (published && published.length > 0) {
        setLessons(published);
      } else {
        setLessons(DEMO_LESSONS);
      }
    } catch (err) {
      console.warn("Appwrite nicht verfügbar, verwende Demo-Daten:", err.message);
      setLessons(DEMO_LESSONS);
    } finally {
      setLessonsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadLessons(), 0);
    return () => clearTimeout(timer);
  }, [loadLessons]);

  // -------------------------------------------------------------------------
  // Lektions-Startzeit erfassen (für Lernzeit im Verlauf)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (activeLesson) {
      setLessonStartedAt(Date.now());
    }
  }, [activeLesson]);

  // -------------------------------------------------------------------------
  // Nächste unvollendete Lektion finden
  // -------------------------------------------------------------------------
  const getNextLesson = useCallback(() => {
    const startIndex = activeLesson
      ? lessons.findIndex((l) => l.id === activeLesson.id)
      : -1;
    if (startIndex === -1) return lessons[0];
    for (let i = 1; i <= lessons.length; i++) {
      const candidate = lessons[(startIndex + i) % lessons.length];
      if (!isLessonCompleted(candidate.id)) return candidate;
    }
    return lessons[0];
  }, [lessons, activeLesson, isLessonCompleted]);

  // Loading state for profile
  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Lade Profil...</p>
        </div>
      </div>
    );
  }

  // XP/Streak/Hearts/Level aus Profil oder Demo-Werte
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const hearts = profile?.hearts ?? 3;
  const level = profile?.level ?? 1;

  // -------------------------------------------------------------------------
  // Lektion auswählen (öffnet During-Lesson View)
  // -------------------------------------------------------------------------
  const selectLesson = (lesson) => {
    setActiveLesson(lesson);
    setView("lesson-in-progress");
    setLessonResult(null);
    setLessonKey((prev) => prev + 1);
  };

  // -------------------------------------------------------------------------
  // Zurück zum Skill-Tree
  // -------------------------------------------------------------------------
  const goToSkillTree = () => {
    setView("skilltree");
    setActiveLesson(null);
    setLessonResult(null);
  };

  // -------------------------------------------------------------------------
  // Zurück zum Profil
  // -------------------------------------------------------------------------
  const goToProfile = () => {
    setView("profile");
  };

  // -------------------------------------------------------------------------
  // Direkt zu den dedizierten Vollbild-Ansichten
  // -------------------------------------------------------------------------
  const goToBadges = () => setView("badges");
  const goToSettings = () => setView("settings");
  const goToHistory = () => setView("history");

  // -------------------------------------------------------------------------
  // Challenge abgeschlossen (XP vergeben, Ergebnis-View öffnen)
  // -------------------------------------------------------------------------
  const handleChallengeComplete = async (xpReward) => {
    let result = null;
    if (activeLesson) {
      try {
        // Demo-Modus: lokaler Abschluss-Eintrag (XP/Streak/Hearts in localStorage)
        const timeSpent = lessonStartedAt
          ? Math.round((Date.now() - lessonStartedAt) / 1000)
          : null;
        result = await completeLesson(
          activeLesson.id,
          xpReward,
          100,
          3,
          activeLesson.title,
          activeLesson.category,
          timeSpent
        );
        setLessonError(null);
      } catch (err) {
        console.error("Fehler beim Abschluss der Lektion:", err);
        setLessonError("Die Lektion konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
        return; // Nicht in Ergebnis-Ansicht wechseln, UI bleibt konsistent
      }
    }
    setLessonResult({
      xpReward,
      score: result?.lessonEntry?.score ?? 100,
      heartsRemaining: result?.lessonEntry?.heartsRemaining ?? 3,
    });
    setView("lesson-result");
  };

  // -------------------------------------------------------------------------
  // Nächste Lektion starten
  // -------------------------------------------------------------------------
  const handleNextLesson = () => {
    const next = getNextLesson();
    if (next) selectLesson(next);
  };

  // -------------------------------------------------------------------------
  // Fehler wiederholen (gleiche Lektion erneut)
  // -------------------------------------------------------------------------
  const handleReviewMistakes = () => {
    if (activeLesson) selectLesson(activeLesson);
  };

  // -------------------------------------------------------------------------
  // Lektion wiederholen (aus Verlauf)
  // -------------------------------------------------------------------------
  const handleRetryLesson = (lesson) => {
    selectLesson(lesson);
  };

  // -------------------------------------------------------------------------
  // Auth View Handler
  // -------------------------------------------------------------------------
  const handleAuthSuccess = (action) => {
    if (action === "switch") {
      setAuthMode((prev) => (prev === "login" ? "register" : "login"));
    } else {
      setView("skilltree");
    }
  };

  // -------------------------------------------------------------------------
  // Header Render
  // -------------------------------------------------------------------------
  const renderHeader = () => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== "skilltree" && (
            <button
              onClick={goToSkillTree}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              title="Zurück zum Lernpfad"
            >
              ←
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-xl">
            C
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-800">ChemVibe</h1>
            <p className="text-sm text-gray-500">Organische Chemie – Lernpfad</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            {[
              { id: "badges", label: "🏆 Erfolge", onClick: goToBadges },
              { id: "settings", label: "⚙️ Einstellungen", onClick: goToSettings },
              { id: "history", label: "📜 Verlauf", onClick: goToHistory },
            ].map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === item.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <UserMenu onProfile={goToProfile} />
          {!user && (
            <button
              onClick={() => setView("auth")}
              className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Anmelden
            </button>
          )}
        </div>
      </div>
    </header>
  );

  // -------------------------------------------------------------------------
  // Skill-Tree Render (mit Kategorie-Gruppierung & Schwierigkeits-Badges)
  // -------------------------------------------------------------------------
  const renderSkillTree = () => (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {renderHeader()}

      <main className="max-w-6xl mx-auto px-6 py-8">
        {lessonsLoading && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Lektionen werden geladen...</p>
          </div>
        )}

        {!lessonsLoading && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">ChemVibe</h1>
            <p className="text-gray-500">Organische Chemie – Lernpfad</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-300">
              <span className="text-yellow-700 font-bold">🔥 {streak}</span>
              <span className="text-yellow-600 text-sm">Streak</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-full border border-indigo-200">
              <span className="text-indigo-700 font-bold">⚡ {xp}</span>
              <span className="text-indigo-600 text-sm">XP</span>
            </div>
            <div className="flex items-center gap-2 bg-rose-100 px-4 py-2 rounded-full border border-rose-200">
              <span className="text-rose-700 font-bold">❤️ {hearts}</span>
              <span className="text-rose-600 text-sm">Leben</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full border border-purple-200">
              <span className="text-purple-700 font-bold">📊 Lvl {level}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Lektionen entdecken</h2>
          <button
            onClick={() => {
              if (isAdmin) {
                setShowAdmin(true);
              } else {
                setAdminMode("login");
                setShowAdmin(true);
              }
            }}
            className="px-4 py-2 rounded-xl font-semibold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 text-sm flex items-center gap-2"
            title="Admin Dashboard (Ctrl+Shift+A)"
          >
            ⚙️ Admin
          </button>
        </div>

        {/* Kategorie-Gruppierung */}
        <div className="space-y-8">
          {["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical"].map(
            (category) => {
              const categoryLessons = lessons.filter((l) => l.category === category);
              if (categoryLessons.length === 0) return null;
              const completedInCategory = categoryLessons.filter((l) =>
                isLessonCompleted(l.id)
              ).length;
              return (
                <div key={category} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                        {category.slice(0, 1)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{category}</h3>
                        <p className="text-xs text-gray-500">
                          {completedInCategory} / {categoryLessons.length} abgeschlossen
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {Math.round((completedInCategory / categoryLessons.length) * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {categoryLessons.map((lesson) => {
                      const completed = isLessonCompleted(lesson.id);
                      const difficultyColors = {
                        easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
                        medium: "bg-amber-100 text-amber-700 border-amber-200",
                        hard: "bg-rose-100 text-rose-700 border-rose-200",
                      };
                      const diffColor =
                        difficultyColors[lesson.challenge?.difficulty] ||
                        difficultyColors.medium;
                      return (
                        <div
                          key={lesson.id}
                          className={`group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all cursor-pointer p-5 ${
                            completed
                              ? "border-emerald-300 bg-emerald-50"
                              : "hover:border-indigo-300"
                          }`}
                          onClick={() => selectLesson(lesson)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              {lesson.category}
                            </span>
                            <span
                              className={`text-xs font-semibold border rounded-md px-2 py-0.5 ${diffColor}`}
                            >
                              {lesson.challenge?.difficulty}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                            {lesson.title}
                            {completed && <span className="ml-2 text-emerald-500">✅</span>}
                          </h3>
                          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                            {lesson.theory?.slice(0, 100)}...
                          </p>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">🧪 Molekül-Baukasten</span>
                            <span className="text-xs font-semibold text-indigo-600">
                              {completed ? "Wiederholen" : "Starten"} ▸
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Keine Lektionen verfügbar.</p>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );

  // -------------------------------------------------------------------------
  // During-Lesson View (LessonInProgress)
  // -------------------------------------------------------------------------
  const renderLessonInProgress = () => {
    if (!activeLesson) return null;
    const completed = isLessonCompleted(activeLesson.id);
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {renderHeader()}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <LessonInProgress
            lesson={activeLesson}
            lessonKey={lessonKey}
            onComplete={handleChallengeComplete}
            onPause={() => {}}
            onResume={() => {}}
            onBack={goToSkillTree}
          />
          {completed && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <p className="text-sm text-amber-700 font-semibold">
                Diese Lektion hast du bereits abgeschlossen. Du kannst sie trotzdem wiederholen.
              </p>
            </div>
          )}
          {lessonError && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <p className="text-sm text-rose-700 font-semibold">{lessonError}</p>
              <button
                onClick={() => setLessonError(null)}
                className="mt-2 text-xs text-rose-600 hover:underline"
              >
                Fehler ausblenden
              </button>
            </div>
          )}
        </main>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Ergebnis-Ansicht (LessonResult)
  // -------------------------------------------------------------------------
  const renderLessonResult = () => {
    if (!activeLesson || !lessonResult) return null;
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        {renderHeader()}
        <main className="max-w-2xl mx-auto px-6 py-8">
          <LessonResult
            lesson={activeLesson}
            xpReward={lessonResult.xpReward}
            score={lessonResult.score}
            heartsRemaining={lessonResult.heartsRemaining}
            onNextLesson={handleNextLesson}
            onReviewMistakes={handleReviewMistakes}
            onBackToSkillTree={goToSkillTree}
          />
        </main>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Profil-Ansicht
  // -------------------------------------------------------------------------
  const renderProfile = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {renderHeader()}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Profile
          allLessons={lessons}
          onRetryLesson={handleRetryLesson}
          onBack={goToSkillTree}
        />
      </main>
    </div>
  );

  // -------------------------------------------------------------------------
  // Erfolge-Ansicht (dediziert)
  // -------------------------------------------------------------------------
  const renderBadges = () => (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {renderHeader()}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Badges onBack={goToSkillTree} />
      </main>
    </div>
  );

  // -------------------------------------------------------------------------
  // Einstellungen-Ansicht (dediziert)
  // -------------------------------------------------------------------------
  const renderSettings = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {renderHeader()}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Settings onBack={goToSkillTree} />
      </main>
    </div>
  );

  // -------------------------------------------------------------------------
  // Verlauf-Ansicht (dediziert)
  // -------------------------------------------------------------------------
  const renderHistory = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {renderHeader()}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <LessonHistory allLessons={lessons} onRetry={handleRetryLesson} />
      </main>
    </div>
  );

  // -------------------------------------------------------------------------
  // Auth View
  // -------------------------------------------------------------------------
  const renderAuthView = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <AuthForm mode={authMode} onSuccess={handleAuthSuccess} />
    </div>
  );

  // -------------------------------------------------------------------------
  // Admin Dashboard / Admin-Login
  // -------------------------------------------------------------------------
  if (showAdmin) {
    if (isAdmin) {
      return (
        <AdminDashboard
          onClose={() => {
            setShowAdmin(false);
            setIsAdmin(false);
            setAdminMode("login");
          }}
          onPublish={loadLessons}
        />
      );
    }
    return (
      <AdminLogin
        onSuccess={() => {
          setIsAdmin(true);
          setAdminMode("dashboard");
        }}
        onBack={() => setShowAdmin(false)}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Haupt-Render je nach View
  // -------------------------------------------------------------------------
  if (view === "auth") {
    return renderAuthView();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {view === "skilltree"
        ? renderSkillTree()
        : view === "lesson-in-progress"
        ? renderLessonInProgress()
        : view === "lesson-result"
        ? renderLessonResult()
        : view === "profile"
        ? renderProfile()
        : view === "badges"
        ? renderBadges()
        : view === "settings"
        ? renderSettings()
        : view === "history"
        ? renderHistory()
        : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App mit Providern
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
