import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useUserProfile } from "../context/UserProfileContext";
import MoleculeBuilder from "./MoleculeBuilder";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function countAtomsByType(atoms) {
  const counts = {};
  (atoms || []).forEach((atom) => {
    counts[atom.type] = (counts[atom.type] || 0) + 1;
  });
  return counts;
}

function buildSections(lesson) {
  if (lesson?.sections && lesson.sections.length > 0) {
    return lesson.sections.map((s, i) => ({
      id: s.id || `section-${i}`,
      title: s.title || `Abschnitt ${i + 1}`,
      type: s.type || "theory",
      content: s.content,
    }));
  }
  const sections = [];
  if (lesson?.theory) {
    sections.push({ id: "theory", title: "Theorie", type: "theory", content: lesson.theory });
  }
  if (lesson?.challenge) {
    sections.push({ id: "challenge", title: "Herausforderung", type: "challenge" });
  }
  return sections;
}

function buildHints(challenge) {
  if (!challenge) return [];
  const hints = [];
  const counts = countAtomsByType(challenge.target_atoms);
  if (counts.carbon) {
    hints.push(`Du benötigst ${counts.carbon} Kohlenstoffatom${counts.carbon > 1 ? "e" : ""}.`);
  }
  if (counts.oxygen) {
    hints.push(`Füge ${counts.oxygen} Sauerstoffatom${counts.oxygen > 1 ? "e" : ""} hinzu.`);
  }
  if (counts.nitrogen) {
    hints.push(`Füge ${counts.nitrogen} Stickstoffatom${counts.nitrogen > 1 ? "e" : ""} hinzu.`);
  }
  if (challenge.target_smiles) {
    hints.push(`Die Ziel-SMILES lautet: ${challenge.target_smiles}.`);
  }
  hints.push("Aktiviere den Bindungsmodus, um Atome miteinander zu verbinden.");
  hints.push("Tipp: Platziere die Atome zuerst, dann verbinde sie mit Bindungen.");
  return hints;
}

// ---------------------------------------------------------------------------
// "Wusstest du?"-Callout-Box (glasig, warm)
// ---------------------------------------------------------------------------
function DidYouKnow({ fact }) {
  return (
    <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 backdrop-blur-sm shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-bold text-amber-800 text-sm uppercase tracking-wider">
            Wusstest du schon?
          </p>
          <p className="text-amber-700 text-sm leading-relaxed">{fact}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animierter XP-Zähler (tickt hoch in Echtzeit)
// ---------------------------------------------------------------------------
function AnimatedXPCounter({ xp }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (xp <= 0) {
      setDisplayed(0);
      return;
    }
    const startTime = performance.now();
    const duration = 900;
    let frame;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(ease * xp));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [xp]);
  return (
    <span className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm">
      ⚡ {displayed} XP
    </span>
  );
}

// ---------------------------------------------------------------------------
// Fortschritts-Anzeige (Lektion gesamt + Theorie/Challenge + Abschnitt)
// ---------------------------------------------------------------------------
function ProgressBar({ lessonPct, theoryPct, challengePct, currentSection, totalSections }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Lektion Fortschritt
        </span>
        <span className="text-xs font-bold text-indigo-600">{Math.round(lessonPct)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${Math.round(lessonPct)}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Theorie {theoryPct}%</span>
        <span>Challenge {challengePct}%</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="font-semibold">{currentSection}</span>
        <span>/</span>
        <span className="font-medium text-gray-600">{totalSections}</span>
        <span className="ml-auto text-gray-500">Abschnitt</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Herzen-Anzeige mit Lebensverlust-Feedback (Bounce-Animation bei Verlust)
// ---------------------------------------------------------------------------
function HeartsDisplay({ hearts, shaking }) {
  return (
    <div className={`flex items-center gap-1.5 ${shaking ? "animate-bounce" : ""}`}>
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
// Während der Lektion (Theory + Molecule Builder + Fortschritt + Herzen + Hinweise)
// ---------------------------------------------------------------------------
export default function LessonInProgress({
  lesson,
  lessonKey,
  onComplete,
  onPause,
  onResume,
  onBack,
}) {
  const { profile, loseHeart } = useUserProfile();
  const hearts = profile?.hearts ?? 3;
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.streak ?? 0;

  const sections = useMemo(() => buildSections(lesson), [lesson]);
  const hints = useMemo(() => buildHints(lesson?.challenge), [lesson?.challenge]);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [theoryPct, setTheoryPct] = useState(0);
  const [challengePct, setChallengePct] = useState(0);
  const [xpEarnedThisLesson, setXpEarnedThisLesson] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [heartsShaking, setHeartsShaking] = useState(false);

  const prevHeartsRef = useRef(hearts);

  // Herz-Verlust-Animation auslösen
  useEffect(() => {
    if (prevHeartsRef.current > hearts) {
      setHeartsShaking(true);
      setTimeout(() => setHeartsShaking(false), 500);
    }
    prevHeartsRef.current = hearts;
  }, [hearts]);

  const currentSection = sections[currentSectionIndex];
  const lessonPct =
    sections.length > 0 ? Math.round((completedSections.size / sections.length) * 100) : 0;

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) onPause?.();
      else onResume?.();
      return next;
    });
  }, [onPause, onResume]);

  const handleLoseHeart = useCallback(async () => {
    await loseHeart();
  }, [loseHeart]);

  const handleTheoryScroll = useCallback(() => {
    setTheoryPct(100);
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add("theory");
      return next;
    });
  }, []);

  const handleChallengeComplete = useCallback(
    async (xpReward) => {
      setChallengePct(100);
      setCompletedSections((prev) => {
        const next = new Set(prev);
        next.add("challenge");
        return next;
      });
      setXpEarnedThisLesson((prev) => prev + xpReward);
      if (onComplete) {
        await onComplete(xpReward);
      }
    },
    [onComplete]
  );

  const goToNextSection = useCallback(() => {
    setCurrentSectionIndex((prev) =>
      prev < sections.length - 1 ? prev + 1 : prev
    );
  }, [sections.length]);

  const goToPrevSection = useCallback(() => {
    setCurrentSectionIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const toggleHints = useCallback(() => {
    setHintsVisible((prev) => !prev);
  }, []);

  const revealNextHint = useCallback(() => {
    setHintIndex((prev) => (prev + 1) % Math.max(hints.length, 1));
    setHintsVisible(true);
  }, [hints.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-indigo-50 text-gray-800">
      {/* Kopfzeile (Glasmorphism) mit XP, Herzen, Pause, Hinweis */}
      <header className="bg-white/60 backdrop-blur-md border-b border-white/40 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white/80 flex items-center justify-center text-gray-600 border border-white/40"
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
              <AnimatedXPCounter xp={xpEarnedThisLesson} />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/40 border border-white/40">
                <span className="text-yellow-600 font-bold text-sm">🔥 {streak}</span>
                <span className="text-xs text-gray-500">Streak</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/40 border border-white/40">
                <span className="text-indigo-600 font-bold text-sm">⚡ {xp}</span>
                <span className="text-xs text-gray-500">XP · Level {level}</span>
              </div>
              <HeartsDisplay hearts={hearts} shaking={heartsShaking} />
              <button
                onClick={togglePause}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  isPaused
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-white/70 text-gray-700 border-white/40 hover:bg-white/80"
                }`}
              >
                {isPaused ? "▶ Fortsetzen" : "⏸ Pause"}
              </button>
              <button
                onClick={toggleHints}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-white/70 text-gray-700 border border-white/40 hover:bg-white/80"
                title="Hinweis"
              >
                💡 Hinweis
              </button>
            </div>
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
              <ProgressBar
                lessonPct={lessonPct}
                theoryPct={theoryPct}
                challengePct={challengePct}
                currentSection={currentSectionIndex + 1}
                totalSections={sections.length}
              />
            </div>

            {/* Lektions-Navigation (Vorherige / Nächster Abschnitt) */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-500">
                Abschnitt {currentSectionIndex + 1} von {sections.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPrevSection}
                  disabled={currentSectionIndex === 0}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white/70 text-gray-700 border border-white/40 hover:bg-white/80"
                >
                  ◀ Vorherige
                </button>
                <button
                  onClick={goToNextSection}
                  disabled={currentSectionIndex === sections.length - 1}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white/70 text-gray-700 border border-white/40 hover:bg-white/80"
                >
                  Nächste ▶
                </button>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur rounded-3xl shadow-xl border border-white/40 overflow-hidden">
              {/* Theorie-Panel */}
              {currentSection?.type !== "challenge" && lesson?.theory && (
                <div className="p-8 border-b border-white/30 bg-white/40">
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
                    {renderTheoryContent(lesson?.theory || "", lesson)}
                  </div>
                </div>
              )}

              {/* Molekül-Baukasten Challenge (prominent) */}
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Molekül-Baukasten</h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
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

            {/* Hinweis-System */}
            {hintsVisible && hints.length > 0 && (
              <div className="mt-6 p-5 rounded-2xl border border-amber-200 bg-amber-50/50 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">💡</span>
                  <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wider">
                    Hinweis
                  </h4>
                </div>
                <p className="text-amber-700 text-sm leading-relaxed mb-4">
                  {hints[hintIndex % hints.length]}
                </p>
                <button
                  onClick={revealNextHint}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition"
                >
                  {hints.length > 1 ? "Nächster Tipp" : "Schließen"}
                </button>
              </div>
            )}
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
      const fact = trimmed.replace(/^(💡\s*Wusstest du\s*(schon)?[:-]?\s*)/i, "");
      return <DidYouKnow key={i} fact={fact} />;
    }
    return (
      <p key={i} className="mb-4 text-gray-600 leading-relaxed text-sm">
        {trimmed}
      </p>
    );
  });
}
