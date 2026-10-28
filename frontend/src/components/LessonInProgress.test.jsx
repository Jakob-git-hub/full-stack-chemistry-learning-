import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LessonInProgress from "./LessonInProgress";

// MoleculeBuilder mocken (verwendet SVG und wäre im Test schwer zu rendern)
vi.mock("./MoleculeBuilder", () => ({
  default: function MoleculeBuilderMock({ challenge, onComplete, xpReward }) {
    return (
      <div data-testid="molecule-builder">
        <button data-testid="challenge-complete" onClick={() => onComplete?.(30)}>
          Challenge abschließen
        </button>
      </div>
    );
  },
}));

vi.mock("../context/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: { xp: 0, streak: 0, hearts: 3, level: 1 },
    loseHeart: vi.fn().mockResolvedValue(2),
    addXp: vi.fn().mockResolvedValue({ newXp: 30, newLevel: 1, leveledUp: false }),
  }),
}));

const defaultProps = {
  lesson: {
    id: "lesson-1",
    title: "Methan",
    category: "Organic Chemistry",
    theory: "Methan (CH₄) ist das einfachste Alkane.\n\n💡 Wusstest du schon? Methan ist ein Treibhausgas.",
    challenge: { question: "Baue Methan", target_smiles: "C" },
  },
  onComplete: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onBack: vi.fn(),
};

describe("LessonInProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rendert die während-Lektion-Ansicht mit Theorie und Challenge", () => {
    render(<LessonInProgress {...defaultProps} />);
    expect(screen.getByText(/Methan/i)).toBeInTheDocument();
    expect(screen.getByText(/Organic Chemistry/i)).toBeInTheDocument();
    expect(screen.getByText(/Molekül-Baukasten/i)).toBeInTheDocument();
    expect(screen.getByTestId("molecule-builder")).toBeInTheDocument();
  });

  it("zeigt den Fortschrittsbalken an", () => {
    render(<LessonInProgress {...defaultProps} />);
    expect(screen.getByText(/Theorie 0%/)).toBeInTheDocument();
    expect(screen.getByText(/Challenge 0%/)).toBeInTheDocument();
  });

  it("zeigt die Herzen-Anzeige an", () => {
    render(<LessonInProgress {...defaultProps} />);
    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
  });

  it("ruft onBack auf", () => {
    render(<LessonInProgress {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Zurück zum Lernpfad"));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it("schaltet Pause ein/aus", () => {
    render(<LessonInProgress {...defaultProps} />);
    fireEvent.click(screen.getByText(/⏸ Pause/));
    expect(screen.getByText(/Lektion pausiert/i)).toBeInTheDocument();
    expect(defaultProps.onPause).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/Weiterlernen/));
    expect(defaultProps.onResume).toHaveBeenCalled();
  });

  it("rendert den 'Wusstest du?'-Callout", () => {
    render(<LessonInProgress {...defaultProps} />);
    expect(screen.getByText(/Wusstest du schon/i)).toBeInTheDocument();
    expect(screen.getByText(/Treibhausgas/i)).toBeInTheDocument();
  });

  it("ruft onComplete mit XP auf, wenn Challenge abgeschlossen wird", async () => {
    render(<LessonInProgress {...defaultProps} />);
    fireEvent.click(screen.getByTestId("challenge-complete"));
    await new Promise((r) => setTimeout(r, 0));
    expect(defaultProps.onComplete).toHaveBeenCalledWith(30);
  });
});
