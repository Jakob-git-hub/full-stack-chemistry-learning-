import { useState, useEffect, useCallback, useRef } from "react";
import MoleculeBuilder from "./components/MoleculeBuilder";
import AdminDashboard from "./components/AdminDashboard";
import {
  fetchPublishedLessons,
  fetchDrafts,
  APPWRITE_CONFIG,
} from "./services/appwrite";

// ---------------------------------------------------------------------------
// Demo-Daten als Fallback (falls Appwrite nicht konfiguriert ist)
// ---------------------------------------------------------------------------
const DEMO_LESSONS = [
  {
    id: "demo-1",
    title: "Methan aufbauen",
    category: "Alkane",
    theory: "Methan (CH₄) ist das einfachste Alkan. Es besteht aus einem Kohlenstoffatom, das mit vier Wasserstoffatomen verbunden ist.",
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
    category: "Alkohole",
    theory: "Methanol (CH₃OH) ist der einfachste Alkohol. Es hat eine Hydroxygruppe (-OH) an einem Kohlenstoff.",
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
    category: "Alkene",
    theory: "Ethen (C₂H₄) ist das einfachste Alken mit einer Doppelbindung zwischen zwei Kohlenstoffatomen.",
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
// App Hauptkomponente
// ---------------------------------------------------------------------------
export default function App() {
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [view, setView] = useState("skilltree"); // 'skilltree' | 'lesson' | 'result'
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(3);
  const [hearts, setHearts] = useState(3);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // Admin Dashboard mit Tastenkombination öffnen (Ctrl+Shift+A)
  const adminKeyRef = useRef({ ctrl: false, shift: false, a: false });
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Control") adminKeyRef.current.ctrl = true;
      if (e.key === "Shift") adminKeyRef.current.shift = true;
      if (e.key.toLowerCase() === "a") adminKeyRef.current.a = true;
      if (adminKeyRef.current.ctrl && adminKeyRef.current.shift && adminKeyRef.current.a) {
        setShowAdmin(true);
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
    try {
      setLoading(true);
      const published = await fetchPublishedLessons();
      if (published && published.length > 0) {
        setLessons(published);
      } else {
        setLessons(DEMO_LESSONS);
      }
    } catch (err) {
      console.warn("Appwrite nicht verfügbar, verwende Demo-Daten:", err.message);
      setLessons(DEMO_LESSONS);
      setError("Appwrite nicht konfiguriert – Demo-Daten werden angezeigt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  // -------------------------------------------------------------------------
  // Lektion auswählen
  // -------------------------------------------------------------------------
  const selectLesson = (lesson) => {
    setActiveLesson(lesson);
    setView("lesson");
  };

  // -------------------------------------------------------------------------
  // Zurück zum Skill-Tree
  // -------------------------------------------------------------------------
  const goToSkillTree = () => {
    setView("skilltree");
    setActiveLesson(null);
  };

  // -------------------------------------------------------------------------
  // Challenge abgeschlossen (XP vergeben)
  // -------------------------------------------------------------------------
  const handleChallengeComplete = (xpReward) => {
    setXp((prev) => prev + xpReward);
    setStreak((prev) => prev + 1);
    setLevel(Math.floor((xp + xpReward) / 100) + 1);
    setView("result");
  };

  // -------------------------------------------------------------------------
  // Nächste Challenge versuchen
  // -------------------------------------------------------------------------
  const retryChallenge = () => {
    setView("lesson");
  };

  // -------------------------------------------------------------------------
  // Skill-Tree Render (Karten-Grid)
  // -------------------------------------------------------------------------
  const renderSkillTree = () => {
    const categoryColors = {
      "Alkane": "from-emerald-100 to-emerald-200",
      "Alkohole": "from-rose-100 to-rose-200",
      "Alkene": "from-amber-100 to-amber-200",
      "Reaktionsmechanismen": "from-indigo-100 to-indigo-200",
    };

    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
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

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Lektionen entdecken</h2>
          <button
            onClick={() => setShowAdmin(true)}
            className="px-4 py-2 rounded-xl font-semibold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 text-sm flex items-center gap-2"
            title="Admin Dashboard (Ctrl+Shift+A)"
          >
            ⚙️ Admin
          </button>
        </div>

        {/* Lektions-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer p-6"
              onClick={() => selectLesson(lesson)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {lesson.category}
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                  {lesson.id.slice(-1)}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                {lesson.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {lesson.theory?.slice(0, 120)}...
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">🧪 Molekül-Baukasten</span>
                <span className="text-xs font-semibold text-indigo-600">Starten ▸</span>
              </div>
            </div>
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Keine Lektionen verfügbar.</p>
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Lektion-Ansicht (Theory + MoleculeBuilder)
  // -------------------------------------------------------------------------
  const renderLessonView = () => {
    if (!activeLesson) return null;

    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={goToSkillTree}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600"
        >
          ← Zurück zum Lernpfad
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Theory-Panel */}
          <div className="p-8 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600 border border-indigo-200">
                {activeLesson.category}
              </span>
              <span className="text-xs text-gray-400">• Molekül-Baukasten</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {activeLesson.title}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {activeLesson.theory}
            </p>
          </div>

          {/* Molekül-Baukasten */}
          <div className="p-8">
            <MoleculeBuilder
              challenge={activeLesson.challenge}
              onComplete={handleChallengeComplete}
              xpReward={30}
            />
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Ergebnis-Ansicht
  // -------------------------------------------------------------------------
  const renderResultView = () => {
    if (!activeLesson) return null;

    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 text-4xl">
          ✅
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Challenge gelöst!</h2>
        <p className="text-gray-500 mb-8">
          Du hast "{activeLesson.title}" erfolgreich aufgebaut.
        </p>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200 inline-block mb-10">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">XP verdient</span>
            <span className="font-bold text-green-700">+30 XP</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Neuer Stand</span>
            <span className="font-bold text-gray-800">⚡ {xp} XP</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={retryChallenge}
            className="px-8 py-3 rounded-xl font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Noch einmal
          </button>
          <button
            onClick={goToSkillTree}
            className="px-8 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
          >
            Zum Lernpfad
          </button>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Lektionen werden geladen...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Haupt-Render je nach View
  // -------------------------------------------------------------------------
  if (showAdmin) {
    return (
      <AdminDashboard onClose={() => setShowAdmin(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {view === "skilltree" ? renderSkillTree() : view === "lesson" ? renderLessonView() : renderResultView()}
    </div>
  );
}