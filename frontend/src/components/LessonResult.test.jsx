import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LessonResult from "./LessonResult";

// Mock des UserProfileContext
vi.mock("../context/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: { xp: 100, streak: 3, hearts: 2, level: 2 },
    addXp: vi.fn().mockResolvedValue({ newXp: 130, newLevel: 2, leveledUp: false }),
    incrementStreak: vi.fn(),
    loseHeart: vi.fn(),
  }),
}));

const defaultProps = {
  lesson: { id: "lesson-1", title: "Methan", category: "Organic Chemistry" },
  xpReward: 30,
  score: 90,
  heartsRemaining: 2,
  onNextLesson: vi.fn(),
  onReviewMistakes: vi.fn(),
  onBackToSkillTree: vi.fn(),
};

describe("LessonResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // navigator.share mocken (nicht in jsdom vorhanden)
    window.navigator.share = vi.fn();
    window.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rendert die Lektions-Ergebnis-Ansicht", () => {
    render(<LessonResult {...defaultProps} />);
    expect(screen.getByText(/Lektion abgeschlossen/i)).toBeInTheDocument();
    expect(screen.getByText(/Methan/i)).toBeInTheDocument();
  });

  it("zeigt XP, Herzen und Streak an", () => {
    render(<LessonResult {...defaultProps} />);
    expect(screen.getByText(/⚡ 100/)).toBeInTheDocument();
    expect(screen.getByText(/❤️ 2/)).toBeInTheDocument();
    expect(screen.getByText(/🔥 3/)).toBeInTheDocument();
  });

  it("zeigt den animierten XP-Zähler an", () => {
    render(<LessonResult {...defaultProps} />);
    expect(screen.getByText(/\+30/)).toBeInTheDocument();
  });

  it("ruft onNextLesson auf", () => {
    render(<LessonResult {...defaultProps} />);
    fireEvent.click(screen.getByText(/Nächste Lektion/));
    expect(defaultProps.onNextLesson).toHaveBeenCalled();
  });

  it("ruft onReviewMistakes auf", () => {
    render(<LessonResult {...defaultProps} />);
    fireEvent.click(screen.getByText(/Fehler wiederholen/));
    expect(defaultProps.onReviewMistakes).toHaveBeenCalled();
  });

  it("ruft onBackToSkillTree auf", () => {
    render(<LessonResult {...defaultProps} />);
    fireEvent.click(screen.getByText(/Zum Lernpfad/));
    expect(defaultProps.onBackToSkillTree).toHaveBeenCalled();
  });

  it("kopiert das Teilen-Ergebnis in die Zwischenablage (Fallback)", () => {
    render(<LessonResult {...defaultProps} />);
    fireEvent.click(screen.getByText(/Ergebnis teilen/));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("Ergebnis in die Zwischenablage kopiert!");
  });
});
