import { useState, useEffect, useCallback, useRef } from "react";
import { useUserProfile } from "../context/UserProfileContext";

// ---------------------------------------------------------------------------
// Einfache Confetti-Partikel-Animation (Canvas, keine externen Dependencies)
// ---------------------------------------------------------------------------
function Confetti() {
  const canvasRef = useRef(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = (canvas.width = 300);
    const height = (canvas.height = 200);
    const particles = [];
    const colors = ["#F59E0B", "#FB7185", "#6366F1", "#10B981", "#FBBF24"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        life: 100,
      });
    }

    let frame;
    const animate = () => {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // Schwerkraft
        p.life -= 2;
        if (p.life > 0) {
          alive = true;
          ctx.globalAlpha = p.life / 100;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      });
      if (alive) {
        frame = requestAnimationFrame(animate);
      } else {
        setActive(false);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      width={300}
      height={200}
    />
  );
}

// ---------------------------------------------------------------------------
// Animierter XP-Zähler (tickt hoch)
// ---------------------------------------------------------------------------
function AnimatedCounter({ target, duration = 1200, prefix = "+" }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    const start = 0;
    const startTime = performance.now();
    let frame;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <span className="font-bold text-2xl">{prefix}{value}</span>;
}

// ---------------------------------------------------------------------------
// Lektions-Ergebnis (After-Lesson Screen)
// ---------------------------------------------------------------------------
export default function LessonResult({
  lesson,
  xpReward = 30,
  score = 100,
  heartsRemaining = 3,
  onNextLesson,
  onReviewMistakes,
  onBackToSkillTree,
}) {
  const { profile, addXp, incrementStreak } = useUserProfile();
  const [xpAwarded, setXpAwarded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const hearts = profile?.hearts ?? 3;
  const level = profile?.level ?? 1;

  // XP einmalig vergeben + Streak erhöhen beim Mount
  useEffect(() => {
    if (xpAwarded) return;
    setShowConfetti(true);
    addXp(xpReward).then((result) => {
      if (result) {
        setLeveledUp(result.leveledUp);
        setNewLevel(result.newLevel);
      }
      setXpAwarded(true);
    });
    incrementStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = useCallback(() => {
    const text = `Ich habe "${lesson?.title}" in ChemVibe abgeschlossen! ⚡ ${xp} XP • 🔥 ${streak} Tage Streak`;
    if (navigator.share) {
      navigator.share({ title: "ChemVibe – Lektion abgeschlossen", text });
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => alert("Ergebnis in die Zwischenablage kopiert!"));
    }
  }, [lesson?.title, xp, streak]);

  const heartsLost = 3 - heartsRemaining;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-indigo-50 text-gray-800">
      <Confetti />

      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBackToSkillTree}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
            title="Zurück zum Lernpfad"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <div>
              <h1 className="font-bold text-sm text-gray-800">ChemVibe</h1>
              <p className="text-xs text-gray-500">Lektion abgeschlossen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold text-sm">❤️ {hearts}</span>
            <span className="text-indigo-600 font-bold text-sm">⚡ {xp}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-green-200">
            <span className="text-5xl">🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Lektion abgeschlossen!</h2>
          <p className="text-gray-500 mb-10">
            Du hast <span className="font-semibold text-indigo-600">{lesson?.title}</span> erfolgreich gemeistert.
          </p>

          {/* Ergebnis-Karte */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">XP verdient</p>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounter target={xpReward} />
                  <span className="text-sm text-amber-600">XP</span>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Leben übrig</p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-rose-600">{hearts}</span>
                  <span className="text-sm text-rose-500">/ 3</span>
                </div>
                {heartsLost > 0 && (
                  <p className="text-xs text-rose-400 mt-1">−{heartsLost} ❤️</p>
                )}
              </div>
              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Streak</p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-yellow-600">🔥 {streak}</span>
                  <span className="text-sm text-indigo-600">Tage</span>
                </div>
              </div>
            </div>

            {leveledUp && (
              <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">✨</span>
                  <span className="font-bold text-lg">Levelaufstieg!</span>
                </div>
                <p className="text-sm text-purple-100">
                  Du bist jetzt <span className="font-bold">Level {newLevel}</span>. Weiter so!
                </p>
              </div>
            )}

            {/* Lektions-Zusammenfassung */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📋</span> Was du gelernt hast
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <span className="text-indigo-600">✓</span>
                  <div>
                    <p className="font-semibold text-gray-800">{lesson?.title}</p>
                    <p className="text-sm text-gray-500">{lesson?.category}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <span className="text-emerald-600">🧪</span>
                  <div>
                    <p className="font-semibold text-gray-800">Molekül-Baukasten gemeistert</p>
                    <p className="text-sm text-gray-500">Struktur erfolgreich aufgebaut und validiert.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  <span className="text-amber-600">⭐</span>
                  <div>
                    <p className="font-semibold text-gray-800">Punktzahl: {score} / 100</p>
                    <p className="text-sm text-gray-500">{heartsRemaining} von 3 Herzen erhalten.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aktionen */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onReviewMistakes}
              className="px-8 py-3.5 rounded-2xl font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              🔁 Fehler wiederholen
            </button>
            <button
              onClick={onNextLesson}
              className="px-8 py-3.5 rounded-2xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition"
            >
              Nächste Lektion ▸
            </button>
            <button
              onClick={onBackToSkillTree}
              className="px-8 py-3.5 rounded-2xl font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              Zum Lernpfad
            </button>
          </div>

          {/* Teilen */}
          <button
            onClick={handleShare}
            className="mt-8 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition"
          >
            <span>🔗</span> Ergebnis teilen
          </button>
        </div>
      </main>
    </div>
  );
}
