import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import XPBar from "./XPBar";

describe("XPBar", () => {
  it("rendert Level, XP bis nächsten Level und Fortschrittsprozent", () => {
    render(<XPBar level={2} xp={150} />);
    expect(screen.getByText(/Level 2/)).toBeInTheDocument();
    expect(screen.getByText(/50 XP bis Level 3/)).toBeInTheDocument();
    expect(screen.getByText(/50% zum nächsten Level/)).toBeInTheDocument();
  });

  it("zeigt 0% bei Level 1 mit 0 XP an", () => {
    render(<XPBar level={1} xp={0} />);
    expect(screen.getByText(/100 XP bis Level 2/)).toBeInTheDocument();
    expect(screen.getByText(/0% zum nächsten Level/)).toBeInTheDocument();
  });

  it("zeigt 100% bei genau 100 XP (Level 2)", () => {
    render(<XPBar level={2} xp={200} />);
    expect(screen.getByText(/0 XP bis Level 3/)).toBeInTheDocument();
    expect(screen.getByText(/100% zum nächsten Level/)).toBeInTheDocument();
  });
});
