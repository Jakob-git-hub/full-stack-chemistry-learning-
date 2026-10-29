import { useState } from "react";

// ---------------------------------------------------------------------------
// Demo Admin-Anmeldedaten (nur für Demo-/Entwicklungszwecke.
// In Produktion sollte die Admin-Prüfung über das Backend erfolgen.)
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = "admin@chemvibe.de";
const ADMIN_PASSWORD = "chemvibe-admin-2026";

export default function AdminLogin({ onSuccess, onBack }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simuliere asynchrone Validierung (Backend-Call in Produktion)
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (formData.email === ADMIN_EMAIL && formData.password === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError("Ungültige Admin-Anmeldedaten");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin-Login</h1>
          <p className="text-gray-500 mt-2">Zugang zum Admin-Dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              id="adminEmail"
              name="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              placeholder="admin@chemvibe.de"
            />
          </div>

          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              id="adminPassword"
              name="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-bold text-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            {isLoading ? "Anmelden..." : "Admin-Anmeldung"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
          >
            ← Zurück zur App
          </button>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
          💡 Demo-Modus: E-Mail{" "}
          <code className="font-mono">admin@chemvibe.de</code>{" "}
          Passwort{" "}
          <code className="font-mono">chemvibe-admin-2026</code>
        </div>
      </div>
    </div>
  );
}
