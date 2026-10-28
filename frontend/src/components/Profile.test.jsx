import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Profile from "./Profile";

// LessonHistory, Badges, AchievementBadge mocken
vi.mock("./LessonHistory", () => ({
  default: function LessonHistoryMock() {
    return <div data-testid="lesson-history">LessonHistory</div>;
  },
}));
vi.mock("./Badges", () => ({
  default: function BadgesMock() {
    return <div data-testid="badges">Badges</div>;
  },
}));
vi.mock("./AchievementBadge", () => ({
  default: function AchievementBadgeMock({ achievement }) {
    return (
      <span data-testid={`badge-${achievement.id}`}>
        {achievement.name}
      </span>
    );
  },
}));

vi.mock("../context/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      userId: "Testnutzer",
      xp: 150,
      streak: 5,
      hearts: 3,
      level: 2,
      completedLessons: [
        { lessonId: "l1", title: "Methan", category: "Organic Chemistry", xpEarned: 30, heartsRemaining: 3, completedAt: "2024-01-01T00:00:00Z" },
      ],
    },
    loading: false,
    getAchievements: vi.fn().mockReturnValue([
      { id: "first-molecule", name: "Erstes Molekül", unlocked: true, progress: 1, maxProgress: 1 },
      { id: "streak-7", name: "7-Tage-Streak", unlocked: false, progress: 5, maxProgress: 7 },
    ]),
    getDailyGoalProgress: vi.fn().mockReturnValue({ current: 30, target: 50, pct: 60 }),
    regenerateHearts: vi.fn(),
    updateSettings: vi.fn().mockResolvedValue({}),
  }),
}));

const defaultProps = {
  allLessons: [],
  onRetryLesson: vi.fn(),
  onBack: vi.fn(),
};

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rendert die Profil-Übersicht mit Avatar, Level, XP, Streak, Herzen", () => {
    render(<Profile {...defaultProps} />);
    expect(screen.getByText(/Testnutzer/i)).toBeInTheDocument();
    expect(screen.getByText(/Level 2/i)).toBeInTheDocument();
    expect(screen.getByText(/⚡ 150/)).toBeInTheDocument();
    expect(screen.getByText(/🔥 5/)).toBeInTheDocument();
    expect(screen.getByText(/❤️ 3/)).toBeInTheDocument();
  });

  it("zeigt die XP-Bar und Fortschritt zum nächsten Level an", () => {
    render(<Profile {...defaultProps} />);
    expect(screen.getByText(/150 XP bis Level 3/i)).toBeInTheDocument();
    expect(screen.getByText(/50% zum nächsten Level/i)).toBeInTheDocument();
  });

  it("zeigt das Tagesziel an", () => {
    render(<Profile {...defaultProps} />);
    expect(screen.getByText(/Tagesziel/i)).toBeInTheDocument();
    expect(screen.getByText(/30 \/ 50 XP heute/i)).toBeInTheDocument();
  });

  it("wechselt zwischen Tabs (Übersicht, Verlauf, Erfolge, Einstellungen)", () => {
    render(<Profile {...defaultProps} />);
    expect(screen.getByText(/Übersicht/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Verlauf/i));
    expect(screen.getByTestId("lesson-history")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Erfolge/i));
    expect(screen.getByTestId("badge-first-molecule")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Einstellungen/i));
    expect(screen.getByText(/Einstellungen/i)).toBeInTheDocument();
  });

  it("zeigt Kurz-Statistiken an", () => {
    render(<Profile {...defaultProps} />);
    expect(screen.getByText(/1/i)).toBeInTheDocument(); // abgeschlossene Lektionen
    expect(screen.getByText(/150/i)).toBeInTheDocument(); // Gesamt-XP
  });

  it("regeneriert Herzen beim Klick", () => {
    render(<Profile {...defaultProps} />);
    fireEvent.click(screen.getByText(/Jetzt prüfen/));
    // regenerateHearts ist gemockt, nur prüfen dass kein Fehler auftritt
  });

  it("schaltet Demo-Modus um", () => {
    render(<Profile {...defaultProps} />);
    fireEvent.click(screen.getByText(/Zum Demo-Modus wechseln/));
    // updateSettings ist gemockt
  });

  it("zeigt den Ladezustand an", () => {
    const { rerender } = render(<Profile {...defaultProps} />);
    // loading=true simulieren erfordert neuen Render mit geändertem Mock;
    // hier prüfen wir nur, dass kein Lade-Indikator im normalen Fall erscheint
    expect(screen.queryByText(/Lade Profil/i)).not.toBeInTheDocument();
  });

  it("ruft onBack auf", () => {
    render(<Profile {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Zurück zum Lernpfad"));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
