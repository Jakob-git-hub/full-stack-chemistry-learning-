import { useState, useCallback, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Atom-Typen und ihre Eigenschaften
// ---------------------------------------------------------------------------
const ATOM_TYPES = {
  carbon: { symbol: "C", name: "Kohlenstoff", color: "#4A4A4A", radius: 18 },
  hydrogen: { symbol: "H", name: "Wasserstoff", color: "#FFFFFF", radius: 12 },
  oxygen: { symbol: "O", name: "Sauerstoff", color: "#FF4D4D", radius: 16 },
  nitrogen: { symbol: "N", name: "Stickstoff", color: "#4D4DFF", radius: 16 },
};

const BOND_COLOR = "#6B7280";
const BOND_STROKE_WIDTH = 4;
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 500;
const GRID_SIZE = 40;

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function countAtomsByType(atoms) {
  const counts = {};
  atoms.forEach((atom) => {
    counts[atom.type] = (counts[atom.type] || 0) + 1;
  });
  return counts;
}

// ---------------------------------------------------------------------------
// MoleculeBuilder Komponente
// ---------------------------------------------------------------------------
export default function MoleculeBuilder({
  challenge,
  onComplete,
  xpReward = 30,
}) {
  const {
    question,
    target_smiles,
    target_atoms = [],
    target_bonds = null,
    preplaced_atoms = [],
    palette_atoms = [
      { type: "carbon", symbol: "C", name: "Kohlenstoff" },
      { type: "hydrogen", symbol: "H", name: "Wasserstoff" },
      { type: "oxygen", symbol: "O", name: "Sauerstoff" },
      { type: "nitrogen", symbol: "N", name: "Stickstoff" },
    ],
    difficulty = "medium",
  } = challenge || {};

  const svgRef = useRef(null);

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [atoms, setAtoms] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [selectedAtomId, setSelectedAtomId] = useState(null);
  const [draggingAtomId, setDraggingAtomId] = useState(null);
  const [bondMode, setBondMode] = useState(false);
  const [validationResult, setValidationResult] = useState(null); // null | "correct" | "incorrect"
  const [isValidating, setIsValidating] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  // -------------------------------------------------------------------------
  // Initialisierung: Pre-placed Atome (für easy/medium Schwierigkeit)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (atoms.length === 0 && preplaced_atoms && preplaced_atoms.length > 0) {
      const initialAtoms = preplaced_atoms.map((p, index) => ({
        id: `pre-${index}`,
        type: p.type,
        x: p.x ?? 200 + index * 60,
        y: p.y ?? 200,
        locked: true,
      }));
      setTimeout(() => setAtoms(initialAtoms), 0);
    }
  }, [preplaced_atoms]);

  // -------------------------------------------------------------------------
  // Atom zum Canvas hinzufügen
  // -------------------------------------------------------------------------
  const addAtom = useCallback(
    (type, x, y) => {
      // Wenn keine Koordinaten angegeben, platziere den Atom nicht stapelnd
      // (verschiebe ihn leicht vom letzten Atom oder in die Mitte)
      let placeX = x;
      let placeY = y;
      if (x === undefined || y === undefined) {
        const last = atoms[atoms.length - 1];
        placeX = last ? last.x + 60 : CANVAS_WIDTH / 2;
        placeY = last ? last.y : CANVAS_HEIGHT / 2;
      }
      const newAtom = {
        id: `atom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type,
        x: snapToGrid(placeX),
        y: snapToGrid(placeY),
        locked: false,
      };
      setAtoms((prev) => [...prev, newAtom]);
      setSelectedAtomId(newAtom.id);
    },
    [atoms]
  );

  // -------------------------------------------------------------------------
  // Atom position aktualisieren (Drag)
  // -------------------------------------------------------------------------
  const updateAtomPosition = useCallback((id, x, y) => {
    setAtoms((prev) =>
      prev.map((atom) =>
        atom.id === id ? { ...atom, x: snapToGrid(x), y: snapToGrid(y) } : atom
      )
    );
  }, []);

  // -------------------------------------------------------------------------
  // Atom löschen
  // -------------------------------------------------------------------------
  const removeAtom = useCallback((id) => {
    setAtoms((prev) => prev.filter((a) => a.id !== id));
    setBonds((prev) =>
      prev.filter((b) => b.atom1 !== id && b.atom2 !== id)
    );
    setSelectedAtomId(null);
  }, []);

  // -------------------------------------------------------------------------
  // Bindung zwischen zwei Atomen erstellen / entfernen
  // -------------------------------------------------------------------------
  const toggleBond = useCallback((id1, id2) => {
    if (id1 === id2) return;

    const bondExists = bonds.some(
      (b) => (b.atom1 === id1 && b.atom2 === id2) || (b.atom1 === id2 && b.atom2 === id1)
    );

    if (bondExists) {
      setBonds((prev) =>
        prev.filter(
          (b) =>
            !((b.atom1 === id1 && b.atom2 === id2) ||
              (b.atom1 === id2 && b.atom2 === id1))
        )
      );
    } else {
      setBonds((prev) => [...prev, { atom1: id1, atom2: id2 }]);
    }
    setSelectedAtomId(null);
    setBondMode(false);
  }, [bonds]);

  // -------------------------------------------------------------------------
  // Validierung gegen Zielstruktur
  // -------------------------------------------------------------------------
  const validateMolecule = useCallback(() => {
    setIsValidating(true);

    // Kurze Verzögerung für visuelles Feedback
    setTimeout(() => {
      let isCorrect = false;
      let message = "";

      if (target_smiles) {
        // Einfache SMILES-Validierung: vergleiche Atom-Typen und Bindungsanzahl
        const userAtomCounts = countAtomsByType(atoms);
        const targetAtomCounts = countAtomsByType(target_atoms);

        const atomsMatch = Object.keys({ ...userAtomCounts, ...targetAtomCounts }).every(
          (key) => (userAtomCounts[key] || 0) === (targetAtomCounts[key] || 0)
        );
        const bondsMatch =
          target_bonds === null || bonds.length === target_bonds;

        isCorrect = atomsMatch && bondsMatch;
        message = isCorrect
          ? "Richtig! Das Molekül wurde korrekt aufgebaut."
          : "Noch nicht ganz richtig. Prüfe die Atom-Anzahl und Bindungen.";
      } else if (target_atoms && target_atoms.length > 0) {
        // Validierung über target_atoms / target_bonds
        const userAtomCounts = countAtomsByType(atoms);
        const targetAtomCounts = countAtomsByType(target_atoms);

        const atomsMatch = Object.keys({ ...userAtomCounts, ...targetAtomCounts }).every(
          (key) => (userAtomCounts[key] || 0) === (targetAtomCounts[key] || 0)
        );
        const bondsMatch =
          target_bonds === null || bonds.length === target_bonds;

        isCorrect = atomsMatch && bondsMatch;
        message = isCorrect
          ? "Richtig! Das Molekül wurde korrekt aufgebaut."
          : "Noch nicht ganz richtig. Prüfe die Struktur.";
      } else {
        isCorrect = false;
        message = "Keine Zielstruktur definiert.";
      }

      setValidationResult(isCorrect ? "correct" : "incorrect");

      if (isCorrect && !xpAwarded && onComplete) {
        setXpAwarded(true);
        onComplete(xpReward);
      }

      setIsValidating(false);
    }, 300);
  }, [atoms, bonds, target_smiles, target_atoms, target_bonds, xpReward, xpAwarded, onComplete]);

  // -------------------------------------------------------------------------
  // Reset / Neubau
  // -------------------------------------------------------------------------
  const resetMolecule = useCallback(() => {
    setAtoms([]);
    setBonds([]);
    setSelectedAtomId(null);
    setValidationResult(null);
    setXpAwarded(false);
    setBondMode(false);

    if (preplaced_atoms && preplaced_atoms.length > 0) {
      const initialAtoms = preplaced_atoms.map((p, index) => ({
        id: `pre-${index}`,
        type: p.type,
        x: p.x ?? 200 + index * 60,
        y: p.y ?? 200,
        locked: true,
      }));
      setAtoms(initialAtoms);
    }
  }, [preplaced_atoms]);

  // -------------------------------------------------------------------------
  // Render: Atom-Node (SVG Gruppe)
  // -------------------------------------------------------------------------
  const renderAtom = (atom) => {
    const typeInfo = ATOM_TYPES[atom.type] || ATOM_TYPES.carbon;
    const isSelected = selectedAtomId === atom.id;
    const isLocked = atom.locked;
    const isDragging = draggingAtomId === atom.id;

    return (
      <g
        key={atom.id}
        transform={`translate(${atom.x},${atom.y})`}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (bondMode && selectedAtomId && selectedAtomId !== atom.id) {
            toggleBond(selectedAtomId, atom.id);
            setDraggingAtomId(null);
          } else if (!isLocked) {
            setSelectedAtomId(atom.id);
            setDraggingAtomId(atom.id);
            setBondMode(false);
          }
        }}
        style={{ cursor: isLocked ? "default" : isDragging ? "grabbing" : "move" }}
      >
        {/* Bindungen werden separat gerendert, hier nur Atome */}
        <circle
          r={typeInfo.radius}
          fill={typeInfo.color}
          stroke={isSelected ? "#FBBF24" : "#374151"}
          strokeWidth={isSelected ? 3 : 2}
          filter="url(#atomShadow)"
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fill={atom.type === "hydrogen" ? "#374151" : "#FFFFFF"}
          fontSize={typeInfo.radius * 0.6}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          pointerEvents="none"
        >
          {typeInfo.symbol}
        </text>
        {!isLocked && (
          <circle
            cx={typeInfo.radius - 6}
            cy={-typeInfo.radius + 6}
            r={6}
            fill="#EF4444"
            onClick={(e) => {
              e.stopPropagation();
              removeAtom(atom.id);
            }}
            style={{ cursor: "pointer" }}
          />
        )}
      </g>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Bindungs-Linien
  // -------------------------------------------------------------------------
  const renderBonds = () => {
    return bonds.map((bond, index) => {
      const atom1 = atoms.find((a) => a.id === bond.atom1);
      const atom2 = atoms.find((a) => a.id === bond.atom2);
      if (!atom1 || !atom2) return null;

      return (
        <line
          key={`bond-${index}`}
          x1={atom1.x}
          y1={atom1.y}
          x2={atom2.x}
          y2={atom2.y}
          stroke={BOND_COLOR}
          strokeWidth={BOND_STROKE_WIDTH}
          strokeLinecap="round"
        />
      );
    });
  };

  // -------------------------------------------------------------------------
  // Template: Atom-Palette
  // -------------------------------------------------------------------------
  const renderPalette = () => {
    return (
      <div className="flex gap-2 p-3 bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-lg">
        {palette_atoms.map((atomType) => {
          const typeInfo = ATOM_TYPES[atomType.type] || ATOM_TYPES.carbon;
          return (
            <button
              key={atomType.type}
              onClick={() => addAtom(atomType.type)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                selectedAtomId && bondMode
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
              title={atomType.name}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: typeInfo.color,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                <span className="text-white font-bold text-sm">
                  {typeInfo.symbol}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Validierungs-Feedback
  // -------------------------------------------------------------------------
  const renderFeedback = () => {
    if (!validationResult) return null;

    const isCorrect = validationResult === "correct";
    return (
      <div
        className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-3 animate-bounce ${
          isCorrect
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-red-100 text-red-800 border border-red-200"
        }`}
      >
        {isCorrect ? "✅" : "❌"}
        {isCorrect
          ? `Richtig! ${xpReward} XP verdient.`
          : "Noch nicht ganz richtig. Versuche es erneut."}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Haupt-Render
  // -------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full">
      {/* Kopfbereich: Frage */}
      <div className="p-6 bg-gradient-to-b from-amber-50 to-rose-50 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-amber-600 font-bold text-sm uppercase tracking-wider">
            Molekül-Baukasten
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200">
            {difficulty}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{question}</h3>
        {target_smiles && (
          <p className="text-sm text-gray-500 mt-1">
            Ziel-SMILES: <code className="bg-gray-200 px-1.5 py-0.5 rounded">{target_smiles}</code>
          </p>
        )}
      </div>

      {/* Arbeitsfläche */}
      <div className="flex-1 relative bg-gray-50 p-6 overflow-auto">
        <svg
          ref={svgRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="bg-white rounded-xl border border-gray-200 shadow-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedAtomId(null);
              setBondMode(false);
              setDraggingAtomId(null);
            }
          }}
          onMouseMove={(e) => {
            if (draggingAtomId) {
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) {
                const atom = atoms.find((a) => a.id === draggingAtomId);
                if (atom && !atom.locked) {
                  const newX = snapToGrid(e.clientX - rect.left);
                  const newY = snapToGrid(e.clientY - rect.top);
                  updateAtomPosition(draggingAtomId, newX, newY);
                }
              }
            }
          }}
          onMouseUp={() => {
            setDraggingAtomId(null);
          }}
        >
          <defs>
            <filter id="atomShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation={3} floodOpacity={0.15} />
            </filter>
          </defs>

          {/* Grid-Hintergrund */}
          <pattern
            id="grid"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Bindungen */}
          {renderBonds()}

          {/* Atome */}
          {atoms.map(renderAtom)}
        </svg>

        {/* Steuerung über der Arbeitsfläche */}
        <div className="absolute bottom-6 left-6 flex flex-col gap-3">
          <button
            onClick={() => setBondMode((prev) => !prev)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              bondMode
                ? "bg-yellow-500 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {bondMode ? "✅ Bindungsmodus aktiv" : "🔗 Bindungsmodus"}
          </button>
          <button
            onClick={resetMolecule}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50"
          >
            🗑️ Zurücksetzen
          </button>
        </div>
      </div>

      {/* Untere Leiste: Palette + Validierung */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Bausteine
            </p>
            {renderPalette()}
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto">
            {renderFeedback()}
            <button
              onClick={validateMolecule}
              disabled={isValidating}
              className={`w-full lg:w-auto px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg ${
                validationResult === "correct"
                  ? "bg-green-500 text-white disabled:opacity-60"
                  : isValidating
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/50"
              }`}
            >
              {isValidating ? "Prüfe..." : "🔍 Überprüfen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}