import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

// Mock appwrite module
vi.mock("./services/appwrite", () => ({
  fetchPublishedLessons: vi.fn(),
  APPWRITE_CONFIG: {
    DATABASE_ID: "chemvibe",
    COLLECTION_ID: "lessons",
  },
}));

import { fetchPublishedLessons } from "./services/appwrite";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the skill tree view by default", () => {
    fetchPublishedLessons.mockResolvedValue([]);
    render(<App />);
    expect(screen.getByText(/ChemVibe/i)).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    fetchPublishedLessons.mockResolvedValue([]);
    render(<App />);
    expect(screen.getByText(/Lektionen werden geladen/i)).toBeInTheDocument();
  });
});