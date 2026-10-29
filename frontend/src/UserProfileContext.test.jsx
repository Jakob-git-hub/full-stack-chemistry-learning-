import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserProfileProvider, useUserProfile } from "./context/UserProfileContext";

// ---------------------------------------------------------------------------
// Test-Helfer: Komponente, die den Context konsumiert
// ---------------------------------------------------------------------------
function ContextConsumer() {
  const ctx = useUserProfile();
  return (
    <div>
      <span data-testid="xp">{ctx.profile?.xp ?? 0}</span>
      <span data-testid="streak">{ctx.profile?.streak ?? 0}</span>
      <span data-testid="hearts">{ctx.profile?.hearts ?? 3}</span>
      <span data-testid="level">{ctx.profile?.level ?? 1}</span>
      <button data-testid="add-xp" onClick={() => ctx.addXp(50)}>
        +50 XP
      </button>
      <button data-testid="lose-heart" onClick={ctx.loseHeart}>
        ❤️ verlieren
      </button>
      <button data-testid="achievements" onClick={() => {}}>
        Erfolge
      </button>
    </div>
  );
}

function Wrapper({ children, user = { $id: "user-1", name: "Test", email: "t@test.de" } }) {
  return (
    <UserProfileProvider user={user}>
      {children}
    </UserProfileProvider>
  );
}

// Appwrite nicht konfiguriert -> Demo-Modus (localStorage)
vi.mock("../services/appwrite", () => ({
  client: { config: { project: "" } },
  databases: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
  APPWRITE_CONFIG: {
    DATABASE_ID: "chemvibe",
    COLLECTION_ID: "lessons",
    PROFILES_COLLECTION_ID: "user_profiles",
  },
}));

describe("UserProfileContext (Demo-Modus)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem("chemvibe_demo_profile");
  });

  afterEach(() => {
    localStorage.removeItem("chemvibe_demo_profile");
  });

  it("initialisiert ein Demo-Profil mit Standardwerten", () => {
    render(
      <Wrapper>
        <ContextConsumer />
      </Wrapper>
    );
    expect(screen.getByTestId("xp").textContent).toBe("0");
    expect(screen.getByTestId("streak").textContent).toBe("0");
    expect(screen.getByTestId("hearts").textContent).toBe("3");
    expect(screen.getByTestId("level").textContent).toBe("1");
  });

  it("addXp erhöht XP und berechnet Level (Level = floor(XP/100) + 1)", async () => {
    render(
      <Wrapper>
        <ContextConsumer />
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId("add-xp"));
    // addXp ist async; kurz warten
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId("xp").textContent).toBe("50");
    expect(screen.getByTestId("level").textContent).toBe("1"); // 50/100 = 0 -> Level 1
  });

  it("erreicht Level 2 bei 100 XP", async () => {
    render(
      <Wrapper>
        <ContextConsumer />
      </Wrapper>
    );
    // Zwei Mal 50 XP = 100 -> Level 2
    fireEvent.click(screen.getByTestId("add-xp"));
    fireEvent.click(screen.getByTestId("add-xp"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId("xp").textContent).toBe("100");
    expect(screen.getByTestId("level").textContent).toBe("2");
  });

  it("loseHeart reduziert die Herzen auf mindestens 0", async () => {
    render(
      <Wrapper>
        <ContextConsumer />
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId("lose-heart"));
    fireEvent.click(screen.getByTestId("lose-heart"));
    fireEvent.click(screen.getByTestId("lose-heart"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId("hearts").textContent).toBe("0");
  });

  it("persistiert das Demo-Profil in localStorage", async () => {
    render(
      <Wrapper>
        <ContextConsumer />
      </Wrapper>
    );
    fireEvent.click(screen.getByTestId("add-xp"));
    await new Promise((r) => setTimeout(r, 0));
    const stored = localStorage.getItem("chemvibe_demo_profile");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.xp).toBe(50);
  });

  it("lädt ein bestehendes Demo-Profil aus localStorage", () => {
    localStorage.setItem(
      "chemvibe_demo_profile",
      JSON.stringify({ xp: 250, streak: 5, hearts: 2, level: 3 })
    );
    render(
      <Wrapper>
        <ContextConsumer />
      </Wrapper>
    );
    expect(screen.getByTestId("xp").textContent).toBe("250");
    expect(screen.getByTestId("streak").textContent).toBe("5");
    expect(screen.getByTestId("hearts").textContent).toBe("2");
    expect(screen.getByTestId("level").textContent).toBe("3");
  });

  it("berechnet Erfolge mit Fortschritt", () => {
    const TestAchievements = () => {
      const { getAchievements, profile } = useUserProfile();
      if (!profile) return null;
      const achs = getAchievements();
      return (
        <div>
          {achs.map((a) => (
            <span key={a.id} data-testid={`ach-${a.id}`}>
              {a.name}:{a.progress}/{a.maxProgress}{a.unlocked ? "✓" : ""}
            </span>
          ))}
        </div>
      );
    };
    render(
      <Wrapper>
        <TestAchievements />
      </Wrapper>
    );
    expect(screen.getByTestId("ach-first-molecule").textContent).toContain("Erstes Molekül:0/1");
  });

  it("getDailyGoalProgress gibt Fortschritt zurück", () => {
    const TestDaily = () => {
      const { getDailyGoalProgress } = useUserProfile();
      const d = getDailyGoalProgress();
      return (
        <div>
          <span data-testid="daily-current">{d.current}</span>
          <span data-testid="daily-target">{d.target}</span>
          <span data-testid="daily-pct">{d.pct}</span>
        </div>
      );
    };
    render(
      <Wrapper>
        <TestDaily />
      </Wrapper>
    );
    expect(screen.getByTestId("daily-target").textContent).toBe("50");
  });
});
