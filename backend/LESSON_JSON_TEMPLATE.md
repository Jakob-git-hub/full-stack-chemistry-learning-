# LLM JSON Output Template for ChemVibe Lessons

The LLM must output **exactly one** of these challenge types. The `type` field determines the structure.

---

## 1. molecule_builder (Current - Fully Implemented)

Build a molecule from atoms/bonds on a canvas.

```json
{
  "title": "Methanol aufbauen",
  "category": "Alkohole",
  "theory": "Methanol (CH₃OH) ist der einfachste Alkohol. Es besteht aus einem Kohlenstoff mit einer Hydroxygruppe (-OH).",
  "challenge": {
    "type": "molecule_builder",
    "question": "Baue Methanol (CH₃OH) – füge eine Hydroxygruppe an Methan an.",
    "difficulty": "medium",
    "target_smiles": "CO",
    "target_atoms": [
      { "type": "carbon", "x": 300, "y": 250 },
      { "type": "oxygen", "x": 400, "y": 250 },
      { "type": "hydrogen", "x": 240, "y": 210 },
      { "type": "hydrogen", "x": 240, "y": 290 },
      { "type": "hydrogen", "x": 360, "y": 210 },
      { "type": "hydrogen", "x": 440, "y": 290 }
    ],
    "target_bonds": 5,
    "preplaced_atoms": [{ "type": "carbon", "x": 300, "y": 250 }],
    "palette_atoms": [
      { "type": "carbon", "symbol": "C", "name": "Kohlenstoff" },
      { "type": "hydrogen", "symbol": "H", "name": "Wasserstoff" },
      { "type": "oxygen", "symbol": "O", "name": "Sauerstoff" }
    ]
  }
}
```

**Atom types**: `carbon`, `hydrogen`, `oxygen`, `nitrogen`, `sulfur`, `phosphorus`, `halogen`
**Canvas**: 700×500, grid 40px, origin top-left

---

## 2. reaction_arrow (Planned)

Drag reaction arrow, assign reactants/products.

```json
{
  "title": "Esterveresterung",
  "category": "Carbonsäurederivate",
  "theory": "Bei der Veresterung reagiert eine Carbonsäure mit einem Alkohol unter Wasserabspaltung zu einem Ester.",
  "challenge": {
    "type": "reaction_arrow",
    "question": "Vervollständige die Reaktionsgleichung: Ziehe den Pfeil und ordne Edukte/Produkte zu.",
    "difficulty": "easy",
    "reaction_smiles": "CC(=O)O.CCO>>CC(=O)OCC.O",
    "components": [
      { "role": "reactant", "smiles": "CC(=O)O", "label": "Essigsäure" },
      { "role": "reactant", "smiles": "CCO", "label": "Ethanol" },
      { "role": "product", "smiles": "CC(=O)OCC", "label": "Ethylacetat" },
      { "role": "product", "smiles": "O", "label": "Wasser" }
    ],
    "show_mechanism_hint": false
  }
}
```

---

## 3. mechanism_step (Planned)

Draw curved arrows for reaction mechanism.

```json
{
  "title": "SN2-Mechanismus",
  "category": "Reaktionsmechanismen",
  "theory": "Bei der SN2-Reaktion greift das Nukleophil von der Rückseite an. Die Bindung zum Abgangsgruppen bricht gleichzeitig.",
  "challenge": {
    "type": "mechanism_step",
    "question": "Zeige den Mechanismus: Zeichne die gekrümmten Pfeile für den Angriff von Hydroxid auf Chlormethan.",
    "difficulty": "hard",
    "canvas_smiles": "C[Cl]",
    "nucleophile_smiles": "[OH-]",
    "steps": [
      { "from": "nucleophile", "to": "carbon", "type": "arrow", "description": "Nukleophiler Angriff" },
      { "from": "carbon", "to": "leaving_group", "type": "arrow", "description": "Abgang der Chlorid-Gruppe" }
    ],
    "target_product_smiles": "CO",
    "show_lone_pairs": true
  }
}
```

---

## 4. multiple_choice (Planned)

Classic multiple choice question.

```json
{
  "title": "Markownikow-Regel",
  "category": "Additionsreaktionen",
  "theory": "Bei der Addition von HX an ungesymmetrische Alkene bindet das Halogen an das stärker substituierte Kohlenstoffatom.",
  "challenge": {
    "type": "multiple_choice",
    "question": "Was ist das Hauptprodukt bei der Addition von HBr an Propen?",
    "difficulty": "easy",
    "options": [
      { "id": "A", "text": "1-Brompropan (CH₃CH₂CH₂Br)", "smiles": "CCCBr" },
      { "id": "B", "text": "2-Brompropan (CH₃CHBrCH₃)", "smiles": "CC(Br)C" },
      { "id": "C", "text": "1,2-Dibrompropan", "smiles": "C(CBr)CBr" }
    ],
    "correct": "B",
    "explanation": "Nach Markownikow bindet Br an das sekundäre C-Atom."
  }
}
```

---

## 5. drag_drop_groups (Planned)

Match functional groups to compounds.

```json
{
  "title": "Funktionelle Gruppen erkennen",
  "category": "Grundlagen",
  "theory": "Funktionelle Gruppen bestimmen die Reaktivität organischer Verbindungen. Lerne die wichtigsten zu erkennen.",
  "challenge": {
    "type": "drag_drop_groups",
    "question": "Ordne jedem Molekül die richtige funktionelle Gruppe zu.",
    "difficulty": "medium",
    "groups": [
      { "id": "alcohol", "name": "Alkohol (-OH)", "smarts": "[OX2H]" },
      { "id": "aldehyde", "name": "Aldehyd (-CHO)", "smarts": "[CX3H1](=O)[#6]" },
      { "id": "ketone", "name": "Keton (>C=O)", "smarts": "[CX3](=O)[#6]" },
      { "id": "acid", "name": "Carbonsäure (-COOH)", "smarts": "[CX3](=O)[OX2H1]" }
    ],
    "compounds": [
      { "id": "c1", "name": "Ethanol", "smiles": "CCO" },
      { "id": "c2", "name": "Acetaldehyd", "smiles": "CC=O" },
      { "id": "c3", "name": "Aceton", "smiles": "CC(=O)C" },
      { "id": "c4", "name": "Essigsäure", "smiles": "CC(=O)O" }
    ],
    "matches": {
      "c1": "alcohol",
      "c2": "aldehyde",
      "c3": "ketone",
      "c4": "acid"
    }
  }
}
```

---

## 6. spectroscopy_match (Planned)

Match NMR/IR/MS spectra to structure.

```json
{
  "title": "¹H-NMR Zuordnung",
  "category": "Spektroskopie",
  "theory": "Im ¹H-NMR zeigen chemisch äquivalente Protonen das gleiche Signal. Die Integration gibt das Verhältnis an.",
  "challenge": {
    "type": "spectroscopy_match",
    "question": "Welche Struktur passt zu diesem ¹H-NMR? (Signale: 1,2 ppm (t, 3H), 2,3 ppm (q, 2H), 3,7 ppm (s, 3H))",
    "difficulty": "hard",
    "spectrum_type": "hnmr",
    "peaks": [
      { "shift": 1.2, "multiplicity": "t", "integration": 3 },
      { "shift": 2.3, "multiplicity": "q", "integration": 2 },
      { "shift": 3.7, "multiplicity": "s", "integration": 3 }
    ],
    "options": [
      { "id": "A", "name": "Ethylmethylether", "smiles": "CCOCC" },
      { "id": "B", "name": "Methylpropanoat", "smiles": "CCC(=O)OC" },
      { "id": "C", "name": "1-Methoxypropan", "smiles": "CCCOC" }
    ],
    "correct": "B"
  }
}
```

---

## 7. retrosynthesis (Planned)

Plan synthesis backwards from target.

```json
{
  "title": "Retrosynthese: Ibuprofen",
  "category": "Syntheseplanung",
  "theory": "Retrosynthese zerlegt ein Zielmolekül in einfachere Vorstufen durch Umkehrung bekannter Reaktionen.",
  "challenge": {
    "type": "retrosynthesis",
    "question": "Plane die Retrosynthese für Ibuprofen. Welche Diskonnektionen sind sinnvoll?",
    "difficulty": "hard",
    "target_smiles": "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
    "allowed_reactions": [
      "friedel_crafts_acylation",
      "grignard",
      "reduction",
      "oxidation"
    ],
    "max_steps": 4,
    "starting_materials": ["benzene", "propanoic_acid", "isobutylene"]
  }
}
```

---

## LLM Decision Guide

The LLM should choose based on **topic** and **difficulty**:

| Topic | Easy | Medium | Hard |
|-------|------|--------|------|
| Alkan/Alkohol Grundlagen | `molecule_builder` | `molecule_builder` | `molecule_builder` |
| Nomenklatur | `multiple_choice` | `drag_drop_groups` | `multiple_choice` |
| Reaktionsmechanismen | `reaction_arrow` | `mechanism_step` | `mechanism_step` |
| Stereochemie | `molecule_builder` | `molecule_builder` | `mechanism_step` |
| Spektroskopie | `multiple_choice` | `spectroscopy_match` | `spectroscopy_match` |
| Syntheseplanung | `reaction_arrow` | `retrosynthesis` | `retrosynthesis` |

---

## Backend Prompt Snippet (for main.py)

Add this to the system prompt so the LLM knows all options:

```python
CHALLENGE_TYPES = """
VERFÜGBARE AUFGABENTYPEN (wähle passend zum Thema):

1. "molecule_builder" - Molekül aus Atomen bauen (Canvas)
   → Für: Strukturformeln, Isomere, Konformationen
   → Felder: target_smiles, target_atoms, target_bonds, preplaced_atoms, palette_atoms

2. "reaction_arrow" - Reaktionsgleichung vervollständigen
   → Für: Reaktionsarten, Gleichgewichte, Stöchiometrie
   → Felder: reaction_smiles, components[]

3. "mechanism_step" - Mechanismus-Pfeile zeichnen
   → Für: SN1/SN2, E1/E2, Addition, Eliminierung
   → Felder: canvas_smiles, nucleophile_smiles, steps[]

4. "multiple_choice" - Klassische Auswahlfrage
   → Für: Definitionen, Regeln, Vorhersagen
   → Felder: options[], correct, explanation

5. "drag_drop_groups" - Gruppen zuordnen
   → Für: Funktionelle Gruppen, Reaktivität, Klassifikation
   → Felder: groups[], compounds[], matches{}

6. "spectroscopy_match" - Spektren zuordnen
   → Für: NMR, IR, MS Interpretation
   → Felder: spectrum_type, peaks[], options[], correct

7. "retrosynthesis" - Syntheseplanung rückwärts
   → Für: Mehrstufige Synthesen, Strategie
   → Felder: target_smiles, allowed_reactions[], max_steps, starting_materials[]

ENTSCHEIDUNGSREGELN:
- Einfache Struktur → molecule_builder
- Reaktionsgleichung → reaction_arrow
- Mechanismusverständnis → mechanism_step
- Wissen abfragen → multiple_choice
- Klassifikation → drag_drop_groups
- Spektren lesen → spectroscopy_match
- Syntheseplanung → retrosynthesis
"""
```

---

## Validation Checklist for LLM Output

Before saving, verify:
- [ ] `type` is one of the 7 valid types
- [ ] All required fields for that type present
- [ ] `target_smiles` is valid SMILES (if applicable)
- [ ] `difficulty` is "easy" | "medium" | "hard"
- [ ] `question` is clear and specific
- [ ] `theory` is 3-4 sentences, Duolingo-style
- [ ] No markdown, no extra text - pure JSON only