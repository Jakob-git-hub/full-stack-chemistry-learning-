import { useState, useEffect, useCallback } from "react";
import { fetchDrafts, fetchLessonById } from "../services/appwrite";

// ---------------------------------------------------------------------------
// Admin Dashboard Komponente
// ---------------------------------------------------------------------------
export default function AdminDashboard({ onClose, onPublish }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [publishing, setPublishing] = useState(null);

  // -------------------------------------------------------------------------
  // Drafts laden
  // -------------------------------------------------------------------------
  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDrafts();
      setDrafts(data || []);
      setError(null);
    } catch (err) {
      console.error("Fehler beim Laden der Drafts:", err);
      setError("Drafts konnten nicht geladen werden. Ist Appwrite konfiguriert?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadDrafts(), 0);
    return () => clearTimeout(timer);
  }, [loadDrafts]);

  // -------------------------------------------------------------------------
  // Einzelne Lektion laden (für Detailansicht)
  // -------------------------------------------------------------------------
  const handleViewLesson = async (lesson) => {
    try {
      const fullLesson = await fetchLessonById(lesson.id);
      setSelectedLesson(fullLesson);
    } catch (err) {
      console.error("Fehler beim Laden der Lektion:", err);
      setError("Lektion konnte nicht geladen werden.");
    }
  };

  // -------------------------------------------------------------------------
  // Lektion veröffentlichen
  // -------------------------------------------------------------------------
  const handlePublish = async (lessonId) => {
    setPublishing(lessonId);
    try {
      // Appwrite update_document für status: "published"
      const { databases, APPWRITE_CONFIG } = await import("../services/appwrite");
      const { ID } = await import("appwrite");

      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTION_ID,
        lessonId,
        {
          status: "published",
          $updatedAt: new Date().toISOString(),
        }
      );

      // Lokal aktualisieren
      setDrafts((prev) => prev.filter((d) => d.id !== lessonId));
      setSelectedLesson(null);
      // Skill-Tree in der Haupt-App aktualisieren, damit die neue Lektion erscheint
      onPublish?.();
    } catch (err) {
      console.error("Fehler beim Veröffentlichen:", err);
      setError("Veröffentlichung fehlgeschlagen.");
    } finally {
      setPublishing(null);
    }
  };

  // -------------------------------------------------------------------------
  // Lektion löschen
  // -------------------------------------------------------------------------
  const handleDelete = async (lessonId) => {
    if (!window.confirm("Diese Lektion wirklich löschen?")) return;

    try {
      const { databases, APPWRITE_CONFIG } = await import("../services/appwrite");
      await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTION_ID,
        lessonId
      );
      setDrafts((prev) => prev.filter((d) => d.id !== lessonId));
      setSelectedLesson(null);
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      setError("Löschen fehlgeschlagen.");
    }
  };

  // -------------------------------------------------------------------------
  // Render: Draft-Karte
  // -------------------------------------------------------------------------
  const renderDraftCard = (lesson) => (
    <div
      key={lesson.id}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
              DRAFT
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              {lesson.category}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">{lesson.title}</h3>
          <p className="text-sm text-gray-500 line-clamp-2">
            {lesson.theory?.slice(0, 150)}...
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => handleViewLesson(lesson)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Details
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>📅 {new Date(lesson.createdAt).toLocaleDateString("de-DE")}</span>
          <span>🆔 {lesson.id.slice(0, 8)}...</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePublish(lesson.id)}
            disabled={publishing === lesson.id}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {publishing === lesson.id ? "Veröffentliche..." : "🚀 Veröffentlichen"}
          </button>
          <button
            onClick={() => handleDelete(lesson.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-red-300 text-red-600 hover:bg-red-50"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render: Detailansicht (Modal)
  // -------------------------------------------------------------------------
  const renderDetailModal = () => {
    if (!selectedLesson) return null;

    const challenge = selectedLesson.challenge || {};

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
            <div>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 mb-2 inline-block">
                DRAFT
              </span>
              <h2 className="text-2xl font-bold text-gray-800">{selectedLesson.title}</h2>
              <p className="text-gray-500 mt-1">{selectedLesson.category}</p>
            </div>
            <button
              onClick={() => setSelectedLesson(null)}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Theory */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Theorie</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {selectedLesson.theory}
              </p>
            </div>

            {/* Challenge Details */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Challenge (Molecule Builder)</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Frage</label>
                  <p className="text-gray-800 mt-1">{challenge.question}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Schwierigkeit</label>
                    <p className="text-gray-800 mt-1 capitalize">{challenge.difficulty}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ziel-SMILES</label>
                    <p className="text-gray-800 mt-1 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {challenge.target_smiles || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ziel-Atome</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(challenge.target_atoms || []).map((atom, i) => (
                      <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                        {atom.type} ({atom.x}, {atom.y})
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ziel-Bindungen</label>
                  <p className="text-gray-800 mt-1">{challenge.target_bonds || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Palette</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(challenge.palette_atoms || []).map((atom, i) => (
                      <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                        {atom.symbol} ({atom.name})
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vorgeplatzte Atome</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(challenge.preplaced_atoms || []).map((atom, i) => (
                      <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full text-sm">
                        {atom.type} ({atom.x}, {atom.y})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
              <button
                onClick={() => setSelectedLesson(null)}
                className="px-6 py-2.5 rounded-xl font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Schließen
              </button>
              <button
                onClick={() => handlePublish(selectedLesson.id)}
                disabled={publishing === selectedLesson.id}
                className="px-6 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {publishing === selectedLesson.id ? "Veröffentliche..." : "🚀 Jetzt veröffentlichen"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Haupt-Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              title="Zurück zur App"
            >
              ←
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-800">ChemVibe Admin</h1>
              <p className="text-sm text-gray-500">Draft-Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
              {drafts.length} Drafts
            </span>
            <button
              onClick={loadDrafts}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "⟳" : "🔄 Aktualisieren"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            >
              Admin-Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 text-4xl">
              📭
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Keine Drafts vorhanden</h2>
            <p className="text-gray-500 mb-6">
              Alle Lektionen sind bereits veröffentlicht oder es wurden noch keine generiert.
            </p>
            <p className="text-sm text-gray-400">
              Nutze <code className="bg-gray-100 px-2 py-1 rounded">POST /generate-agent-lesson</code>
              um neue Lektionen zu erstellen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map(renderDraftCard)}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
}