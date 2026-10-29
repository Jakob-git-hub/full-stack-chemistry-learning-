import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Account, ID } from "appwrite";
import { client } from "../services/appwrite";

// ---------------------------------------------------------------------------
// Auth Context
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prüfe ob Appwrite konfiguriert ist (Project ID gesetzt)
  const isAppwriteConfigured = client.config.project && client.config.project !== "";

  const account = isAppwriteConfigured ? new Account(client) : null;

  // -------------------------------------------------------------------------
  // Aktuellen User prüfen (Session)
  // -------------------------------------------------------------------------
  const checkSession = useCallback(async () => {
    if (!isAppwriteConfigured || !account) {
      // Demo-Modus: Kein Appwrite konfiguriert
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (err) {
      // Keine Session - User ist nicht eingeloggt
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [account, isAppwriteConfigured]);

  useEffect(() => {
    const timer = setTimeout(() => checkSession(), 0);
    return () => clearTimeout(timer);
  }, [checkSession]);

  // -------------------------------------------------------------------------
  // Registrierung
  // -------------------------------------------------------------------------
  const register = async (email, password, name) => {
    setError(null);
    try {
      const newUser = await account.create(ID.unique(), email, password, name);
      // Automatisch einloggen nach Registrierung
      await login(email, password);
      return newUser;
    } catch (err) {
      setError(err.message || "Registrierung fehlgeschlagen");
      throw err;
    }
  };

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  const login = async (email, password) => {
    setError(null);
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      setError(err.message || "Login fehlgeschlagen");
      throw err;
    }
  };

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setUser(null);
    }
  };

  // -------------------------------------------------------------------------
  // Passwort zurücksetzen (E-Mail senden)
  // -------------------------------------------------------------------------
  const requestPasswordReset = async (email) => {
    setError(null);
    try {
      await account.createRecovery(email, `${window.location.origin}/reset-password`);
    } catch (err) {
      setError(err.message || "Fehler beim Senden der Reset-E-Mail");
      throw err;
    }
  };

  // -------------------------------------------------------------------------
  // Passwort zurücksetzen (mit Token)
  // -------------------------------------------------------------------------
  const resetPassword = async (userId, secret, password, passwordAgain) => {
    setError(null);
    try {
      await account.updateRecovery(userId, secret, password, passwordAgain);
    } catch (err) {
      setError(err.message || "Passwort-Reset fehlgeschlagen");
      throw err;
    }
  };

  // -------------------------------------------------------------------------
  // E-Mail verifizieren
  // -------------------------------------------------------------------------
  const sendVerificationEmail = async () => {
    if (!user) return;
    try {
      await account.createVerification(`${window.location.origin}/verify-email`);
    } catch (err) {
      setError(err.message || "Verifizierungs-E-Mail konnte nicht gesendet werden");
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail,
    checkSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth muss innerhalb eines AuthProvider verwendet werden");
  }
  return context;
}