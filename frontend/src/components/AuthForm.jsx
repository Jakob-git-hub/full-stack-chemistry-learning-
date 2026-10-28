import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// Auth Form Component (Login / Register)
// ---------------------------------------------------------------------------
export default function AuthForm({ mode = "login", onSuccess }) {
  const { login, register, error: authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });

  const isRegister = mode === "register";

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        setFormError("Passwörter stimmen nicht überein");
        return;
      }
      if (formData.password.length < 6) {
        setFormError("Passwort muss mindestens 6 Zeichen haben");
        return;
      }
      if (!formData.name.trim()) {
        setFormError("Name ist erforderlich");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        await register(formData.email, formData.password, formData.name);
      } else {
        await login(formData.email, formData.password);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(err.message || "Fehler bei der Anmeldung");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setFormError("");
    if (onSuccess) onSuccess("switch");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isRegister ? "Account erstellen" : "Willkommen zurück"}
          </h1>
          <p className="text-gray-500 mt-2">
            {isRegister
              ? "Starte deine Reise in die Organische Chemie"
              : "Melde dich an, um deinen Fortschritt zu speichern"}
          </p>
        </div>

        {/* Error Messages */}
        {(authError || formError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError || authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                placeholder="Dein Name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              placeholder="deine@email.de"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort bestätigen
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-bold text-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-indigo-500/30"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isRegister ? "Erstelle Account..." : "Melde an..."}
              </span>
            ) : (
              isRegister ? "Account erstellen" : "Anmelden"
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-6 text-center text-gray-600">
          {isRegister ? (
            <>
              Schon einen Account?{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                Anmelden
              </button>
            </>
          ) : (
            <>
              Noch keinen Account?{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                Registrieren
              </button>
            </>
          )}
        </div>

        {/* Demo Hint */}
        <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
          💡 Demo-Modus: Appwrite nicht konfiguriert? Die App funktioniert auch ohne Login mit lokalen Daten.
        </div>
      </div>
    </div>
  );
}