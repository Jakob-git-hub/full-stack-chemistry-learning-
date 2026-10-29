import { useState, useCallback } from "react";
import { useUserProfile } from "../context/UserProfileContext";
import MoleculeBuilder from "./MoleculeBuilder";

// ---------------------------------------------------------------------------
// "Wusstest du?"-Callout-Box
// ---------------------------------------------------------------------------
function DidYouKnow({ fact }) {
  return (
    <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-bold text-amber-800 text-sm">Wusstest du schon?</p>
          <p className="text-amber-700 text-sm leading-relaxed">{fact}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fortschritts-Anzeige (Theory X% · Challenge Y%)
// ---------------------------------------------------------------------------
function ProgressBar({ theoryPct, challengePct }) {
  return (
    <>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${Math.max(theoryPct, challengePct)}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Theorie {theoryPct}%</span>
        <span>Challenge {challengePct}%</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Herzen-Anzeige mit Lebensverlust-Feedback
// ---------------------------------------------------------------------------
function HeartsDisplay({ hearts, onLoseHeart }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`text-2xl transition-transform duration-200 ${
            i <= hearts ? "text-rose-500" : "text-gray-200"
          }`}
        >
          ❤️
        </span>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-500">{hearts} / 3</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Während der Lektion (Theory + Molecule Builder + Fortschritt + Herzen)
// ---------------------------------------------------------------------------
export default function LessonInProgress({
  lesson,
  lessonKey,
  onComplete,
  onPause,
  onResume,
  onBack,
}) {
  const { profile, loseHeart, addXp } = useUserProfile();
  const hearts = profile?.hearts ?? 3;
  const [isPaused, setIsPaused] = useState(false);
  const [theoryPct, setTheoryPct] = useState(0);
  const [challengePct, setChallengePct] = useState(0);
  const [scrolledTheory, setScrolledTheory] = useState(false);

  const handleChallengeComplete = useCallback(
    async (xpReward) => {
      setChallengePct(100);
      if (onComplete) {
        await onComplete(xpReward);
      }
    },
    [onComplete]
  );

  const handleLoseHeart = useCallback(async () => {
    await loseHeart();
  }, [loseHeart]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) onPause?.();
      else onResume?.();
      return next;
    });
  }, [onPause, onResume]);

  // Theorie-Fortschritt beim Scrollen simulieren
  const handleTheoryScroll = useCallback(() => {
    setScrolledTheory(true);
    setTheoryPct(100);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Kopfzeile mit Fortschritt + Herzen + Pause */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              title="Zurück zum Lernpfad"
            >
              ←
            </button>
            <div className="hidden sm:flex flex-col">
              <h1 className="font-bold text-sm text-gray-800">ChemVibe</h1>
              <p className="text-xs text-gray-500">{lesson?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HeartsDisplay hearts={hearts} onLoseHeart={handleLoseHeart} />
            <button
              onClick={togglePause}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isPaused
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              {isPaused ? "▶ Fortsetzen" : "⏸ Pause"}
            </button>
          </div>
        </div>
      </header>

      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md mx-auto">
            <div className="text-4xl mb-4">⏸</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Lektion pausiert</h2>
            <p className="text-gray-500 mb-6">Nimm dir eine kurze Pause. Dein Fortschritt wird gespeichert.</p>
            <button
              onClick={togglePause}
              className="px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Weiterlernen
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!isPaused && (
          <>
            {/* Fortschritts-Anzeige */}
            <div className="mb-6">
              <ProgressBar theoryPct={theoryPct} challengePct={challengePct} />
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Theorie-Panel */}
              <div className="p-8 border-b border-gray-100 bg-gray-50" onScroll={handleTheoryScroll}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600 border border-indigo-200">
                    {lesson?.category}
                  </span>
                  <span className="text-xs text-gray-400">• Theorie</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  {lesson?.title}
                </h2>
                <div className="prose prose-sm text-gray-600 leading-relaxed max-w-none">
                  {/* Theorie mit chemischen Formeln und Callouts */}
                  {renderTheoryContent(lesson?.theory || "", lesson)}
                </div>
              </div>

              {/* Molekül-Baukasten Challenge */}
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Molekül-Baukasten</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                    Challenge
                  </span>
                </div>
                <MoleculeBuilder
                  key={lessonKey}
                  challenge={lesson?.challenge}
                  onComplete={handleChallengeComplete}
                  xpReward={30}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theorie-Inhalt rendern: Formeln + "Wusstest du?"-Callouts
// ---------------------------------------------------------------------------
function renderTheoryContent(theory, lesson) {
  // Einfache Aufteilung: Absätze, wobei "💡 Wusstest du?" als Callout erkannt wird
  const paragraphs = theory.split("\n\n").filter(Boolean);
  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (trimmed.startsWith("💡") || trimmed.startsWith("Wusstest du")) {
      const fact = trimmed.replace(/^(💡\s*Wusstest du\s*(schon)?[:\-]?\s*)/i, "");
      return <DidYouKnow key={i} fact={fact} />;
    }
    return (
      <p key={i} className="mb-4 text-gray-600 leading-relaxed">
        {trimmed}
      </p>
    );
  });
}
