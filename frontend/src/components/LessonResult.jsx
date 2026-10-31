import { useState, useEffect, useCallback, useRef } from "react";
import { useUserProfile } from "../context/UserProfileContext";

// ---------------------------------------------------------------------------
// Confetti-Partikel-Animation (Canvas, keine externen Dependencies)
// Löst bei jedem Wechsel von `trigger` einen neuen Feuerwerk-Ausbruch aus.
// ---------------------------------------------------------------------------
function Confetti({ trigger = 0 }) {
  const canvasRef = useRef(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const particles = [];
    const colors = ["#F59E0B", "#FB7185", "#6366F1", "#10B981", "#FBBF24"];

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: width / 2,
        y: height * 0.25,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 4,
        shape: Math.random() > 0.5 ? "square" : "circle",
        life: 100,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    setActive(true);
    let frame;
    const animate = () => {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Schwerkraft
        p.vx *= 0.96; // Luftwiderstand
        p.rotation += p.rotationSpeed;
        p.life -= 1.5;
        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.life / 100;
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          }
          ctx.restore();
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
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none z-50 transition-opacity duration-500 ${!active ? "opacity-0" : "opacity-100"}`}
      style={{ width: "100vw", height: "100vh" }}
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
      setTimeout(() => setValue(0), 0);
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
  timeSpent, // Sekunden, optional; wird aus der Lektions-Schwierigkeit geschätzt
  onNextLesson,
  onReviewMistakes,
  onBackToSkillTree,
}) {
  const { profile, getAchievements } = useUserProfile();
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const announcedBadgeIds = useRef(new Set());

  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const hearts = profile?.hearts ?? 3;
  const level = profile?.level ?? 1;

  // Level-Aufstieg erkennen (die XP der aktuellen Lektion ist bereits enthalten)
  const previousLevel = Math.floor(Math.max(0, xp - xpReward) / 100) + 1;
  const didLevelUp = level > previousLevel;

  const heartsLost = 3 - heartsRemaining;

  const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
  const streakMilestone = STREAK_MILESTONES.includes(streak) ? streak : null;

  const difficulty = lesson?.challenge?.difficulty;
  const difficultyLabels = { easy: "Einfach", medium: "Mittel", hard: "Schwer" };
  const estimatedMinutes = { easy: 5, medium: 8, hard: 12 }[difficulty] ?? 8;
  const minutesSpent =
    timeSpent != null ? Math.max(1, Math.round(timeSpent / 60)) : estimatedMinutes;
  const timeLabel = timeSpent != null ? `${minutesSpent} Min.` : `ca. ${minutesSpent} Min.`;

  const getGrade = (s) => {
    if (s >= 95) return { letter: "A+", label: "Exzellent!", color: "emerald" };
    if (s >= 90) return { letter: "A", label: "Sehr gut!", color: "indigo" };
    if (s >= 80) return { letter: "B", label: "Gut!", color: "amber" };
    if (s >= 70) return { letter: "C", label: "Kann besser werden", color: "rose" };
    if (s >= 60) return { letter: "D", label: "Bestanden", color: "rose" };
    return { letter: "F", label: "Versucht", color: "rose" };
  };
  const grade = getGrade(score);

  // Confetti: beim Start, bei Levelaufstieg und bei perfekter Punktzahl
  useEffect(() => {
    const timer = setTimeout(() => setConfettiTrigger((k) => k + 1), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (didLevelUp) {
      setLeveledUp(true);
      setConfettiTrigger((k) => k + 1);
    }
  }, [didLevelUp]);

  useEffect(() => {
    if (score === 100) setConfettiTrigger((k) => k + 1);
  }, [score]);

  // Neue Erfolge ermitteln und einmalig pro Sitzung ankündigen
  useEffect(() => {
    if (!getAchievements) return;
    const unlocked = getAchievements().filter((a) => a.unlocked);
    const newly = unlocked.filter((a) => !announcedBadgeIds.current.has(a.id));
    newly.forEach((a) => announcedBadgeIds.current.add(a.id));
    if (newly.length > 0) setNewBadges(newly);
  }, [getAchievements]);

  const handleShare = useCallback(() => {
    const text = `Ich habe "${lesson?.title}" in ChemVibe abgeschlossen! ${grade.letter} • ${score}% • ⚡ ${xp} XP • 🔥 ${streak} Tage Streak`;
    if (navigator.share) {
      navigator.share({ title: "ChemVibe – Lektion abgeschlossen", text });
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => alert("Ergebnis in die Zwischenablage kopiert!"));
    }
  }, [lesson?.title, score, grade.letter, xp, streak]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-indigo-50 text-gray-800">
      <Confetti trigger={confettiTrigger} />

      <header className="bg-white/70 backdrop-blur-md border-b border-white/60 sticky top-0 z-40">
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
          <div className="flex items-center gap-3">
            <span className="text-rose-600 font-bold text-sm">❤️ {hearts}</span>
            <span className="text-indigo-600 font-bold text-sm">⚡ {xp}</span>
            <span className="text-amber-600 font-bold text-sm">📊 Lvl {level}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center space-y-5">
          <div className="relative inline-block">
            <span
              className={`text-8xl filter drop-shadow-lg animate-bounce ${
                score >= 80 ? "text-amber-500" : "text-gray-400"
              }`}
            >
              {score === 100 ? "🏆" : score >= 80 ? "🎉" : "👏"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Lektion abgeschlossen!</h2>
          <p className="text-gray-500">
            Du hast <span className="font-semibold text-indigo-600">{lesson?.title}</span> erfolgreich gemeistert.
          </p>

          {/* Note-Karte */}
          <div className="rounded-3xl p-6 md:p-8 shadow-xl border border-white/60 bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center md:text-left">
              <div
                className={`text-6xl font-black rounded-2xl p-4 md:p-6 ${grade.color}-100 border border-${grade.color}-200 shadow-${grade.color}-200/40`}
              >
                {grade.letter}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  {score}% Punktzahl
                </p>
                <p className={`text-2xl font-bold ${grade.color}-600`}>{grade.label}</p>
              </div>
            </div>
          </div>

          {/* Statistiken */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                XP verdient
              </p>
              <div className="flex items-baseline gap-1">
                <AnimatedCounter target={xpReward} />
                <span className="text-sm text-amber-600">XP</span>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
                Leben übrig
              </p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-rose-600">{heartsRemaining}</span>
                <span className="text-sm text-rose-500">/ 3</span>
              </div>
              {heartsLost > 0 && (
                <p className="text-xs text-rose-400 mt-1">−{heartsLost} ❤️</p>
              )}
            </div>
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                Streak
              </p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-yellow-600">🔥 {streak}</span>
                <span className="text-sm text-indigo-600">Tage</span>
              </div>
            </div>
          </div>

          {leveledUp && (
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg shadow-indigo-200/40">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-bold text-lg">Levelaufstieg!</p>
                  <p className="text-sm text-indigo-100">
                    Du bist jetzt <span className="font-bold">Level {level}</span>. Weiter so!
                  </p>
                </div>
              </div>
            </div>
          )}

          {streakMilestone && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-100 border border-amber-200 shadow-sm">
              <p className="font-bold text-amber-800">
                🎯 Streak-Meilenstein: {streakMilestone} Tage!
              </p>
              <p className="text-sm text-amber-700">
                Du bist {streakMilestone} Tage in Folge dabei. Feuer! 🔥
              </p>
            </div>
          )}

          {newBadges.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🎖️</span> Neue Erfolge freigeschaltet
              </h3>
              <div className="space-y-3">
                {newBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-3 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <p className="font-bold text-gray-800">{badge.name}</p>
                        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">
                          Neu freigeschaltet 🎖️
                        </p>
                        <p className="text-sm text-gray-500">{badge.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lektions-Zusammenfassung */}
          <div className="mt-6 rounded-3xl p-6 md:p-8 shadow-xl border border-white/60 bg-white/80 backdrop-blur-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📋</span> Was du gelernt hast
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-white/80">
                <span className="text-indigo-600">📚</span>
                <div>
                  <p className="font-semibold text-gray-800">{lesson?.category}</p>
                  <p className="text-sm text-gray-500">
                    {difficultyLabels[difficulty] ?? "Mittel"} • {score} Punkte
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-white/80">
                <span className="text-emerald-600">⏱️</span>
                <div>
                  <p className="font-semibold text-gray-800">Lernzeit</p>
                  <p className="text-sm text-gray-500">{timeLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-white/80">
                <span className="text-rose-600">❤️</span>
                <div>
                  <p className="font-semibold text-gray-800">Hearts übrig</p>
                  <p className="text-sm text-gray-500">
                    {heartsRemaining} / 3{heartsLost > 0 ? ` (−${heartsLost})` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-white/80">
                <span className="text-amber-600">⚡</span>
                <div>
                  <p className="font-semibold text-gray-800">XP verdient</p>
                  <p className="text-sm text-gray-500">+{xpReward} XP</p>
                </div>
              </div>
            </div>
          </div>

          {/* Aktionen */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            {(score < 100 || heartsRemaining < 3) && (
              <button
                onClick={onReviewMistakes}
                className="px-8 py-3.5 rounded-2xl font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition"
              >
                🔁 Fehler wiederholen
              </button>
            )}
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
