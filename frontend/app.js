/**
 * ChemVibe – Gamified Frontend for Organic Chemistry
 * Duolingo-style learning experience with Appwrite integration.
 * Includes interactive Molecule Builder (molecule_builder task type).
 */

// ---------------------------------------------------------------------------
// Appwrite configuration
// ---------------------------------------------------------------------------
const APPWRITE_CONFIG = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: 'YOUR_PROJECT_ID',
  databaseId: 'chemvibe',
  collectionId: 'lessons',
};

const { Client, Databases, Query } = appwrite;
const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------
const app = {
  lessons: [],
  currentLessonIndex: 0,
  currentChallengeIndex: 0,
  hearts: 3,
  streak: 0,
  xp: 0,
  level: 1,
  currentLesson: null,

  // Molecule builder state
  moleculeBuilder: {
    atoms: [],        // { id, x, y, type, symbol, element }
    bonds: [],        // { id, atom1Id, atom2Id, order }
    selectedAtomId: null,
    isBondMode: false,
    targetSmiles: null,
    targetAtoms: null,
    targetBonds: null,
    difficulty: 'medium',
    svg: null,
    svgPoint: null,
    bondLine: null,
    bondStartAtom: null,
  },

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  showHome() {
    this.hideAllViews();
    document.getElementById('skill-tree-view').classList.remove('hidden');
    this.loadLessons();
  },

  showSkillTree() {
    this.hideAllViews();
    document.getElementById('skill-tree-view').classList.remove('hidden');
    this.renderSkillTree();
  },

  hideAllViews() {
    document.getElementById('skill-tree-view').classList.add('hidden');
    document.getElementById('lesson-view').classList.add('hidden');
    document.getElementById('result-view').classList.add('hidden');
    document.getElementById('hearts-modal').classList.add('hidden');
  },

  // -------------------------------------------------------------------------
  // Data loading (Appwrite)
  // -------------------------------------------------------------------------
  async loadLessons() {
    const loading = document.getElementById('skill-tree-loading');
    const nodes = document.getElementById('skill-nodes');
    loading.classList.remove('hidden');
    nodes.innerHTML = '';

    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collectionId,
        [Query.limit(100), Query.orderAsc('order')]
      );
      this.lessons = response.documents || [];
    } catch (error) {
      console.error('Appwrite load error:', error);
      this.lessons = this.getDemoLessons();
    } finally {
      loading.classList.add('hidden');
      this.renderSkillTree();
    }
  },

  renderSkillTree() {
    const nodesContainer = document.getElementById('skill-nodes');
    nodesContainer.innerHTML = '';

    if (!this.lessons || this.lessons.length === 0) {
      nodesContainer.innerHTML = '<p class="text-slate-500 text-center">Keine Lektionen verfügbar.</p>';
      return;
    }

    this.lessons.forEach((lesson, index) => {
      const isUnlocked = index === 0 || index <= this.currentLessonIndex;
      const isCompleted = index < this.currentLessonIndex;
      const isCurrent = index === this.currentLessonIndex;

      const node = document.createElement('div');
      node.className = `skill-node ${!isUnlocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`;
      node.style.animationDelay = `${index * 0.1}s`;
      node.classList.add('fade-in');

      if (!isUnlocked) {
        node.innerHTML = `
          <div class="lock-overlay">
            <div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
              🔒
            </div>
          </div>
          <div class="mt-4 text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400 text-xl">
              ${lesson.icon || '⚛️'}
            </div>
            <h4 class="text-sm font-semibold text-slate-400 mb-1">${lesson.title}</h4>
            <p class="text-xs text-slate-400">Bald verfügbar</p>
          </div>
        `;
      } else {
        node.innerHTML = `
          <div class="mt-4 text-center">
            <div class="w-16 h-16 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center mx-auto mb-2 text-xl shadow-md">
              ${isCompleted ? '✅' : lesson.icon || '⚛️'}
            </div>
            <h4 class="text-sm font-semibold ${isCompleted ? 'text-emerald-700' : 'text-slate-800'} mb-1">${lesson.title}</h4>
            <p class="text-xs ${isCompleted ? 'text-emerald-500' : 'text-slate-500'}">${isCompleted ? 'Abgeschlossen' : 'Bereit'}</p>
          </div>
        `;
        node.onclick = () => this.startLesson(index);
      }

      nodesContainer.appendChild(node);
    });
  },

  // -------------------------------------------------------------------------
  // Lesson flow
  // -------------------------------------------------------------------------
  startLesson(index) {
    if (this.hearts <= 0) {
      document.getElementById('hearts-modal').classList.remove('hidden');
      return;
    }

    this.currentLessonIndex = index;
    this.currentChallengeIndex = 0;
    this.currentLesson = this.lessons[index];

    this.hideAllViews();
    document.getElementById('lesson-view').classList.remove('hidden');
    this.updateStatusBar();
    this.renderLessonStep();
  },

  renderLessonStep() {
    const container = document.getElementById('lesson-container');
    const lesson = this.currentLesson;
    const steps = lesson.steps || [];
    const step = steps[this.currentChallengeIndex];

    // Progress
    document.getElementById('lesson-progress').textContent = `${this.currentChallengeIndex + 1} / ${steps.length}`;
    document.getElementById('hearts-warning').classList.toggle('hidden', this.hearts > 1);

    if (!step) {
      this.finishLesson();
      return;
    }

    container.innerHTML = '';

    // Info chunk (if present)
    if (step.info) {
      const infoEl = document.createElement('div');
      infoEl.className = 'info-chunk fade-in';
      infoEl.innerHTML = `
        <h3>${step.info.title || 'Wusstest du?'}</h3>
        <div class="prose-content">${step.info.content}</div>
      `;
      container.appendChild(infoEl);
    }

    // Challenge
    const challengeEl = document.createElement('div');
    challengeEl.className = 'challenge-card fade-in';
    challengeEl.innerHTML = this.buildChallengeHTML(step);
    container.appendChild(challengeEl);

    // Continue button (hidden until answered)
    const continueBtn = document.createElement('button');
    continueBtn.id = 'continue-btn';
    continueBtn.className = 'hidden w-full py-3 rounded-2xl bg-amber-500 text-white font-bold shadow-lg hover:bg-amber-600 transform hover:-translate-y-1 transition mt-6';
    continueBtn.textContent = 'Weiter';
    continueBtn.onclick = () => this.nextStep();
    container.appendChild(continueBtn);

    // Initialize challenge interactivity
    this.initChallenge(step);
  },

  buildChallengeHTML(step) {
    const type = step.type;
    const id = `challenge-${this.currentChallengeIndex}`;

    switch (type) {
      case 'multiple_choice':
        return this.buildMultipleChoice(step, id);

      case 'drag_drop':
        return this.buildDragDrop(step, id);

      case 'matching':
        return this.buildMatching(step, id);

      case 'molecule':
        return this.buildMoleculeChoice(step, id);

      case 'molecule_builder':
        return this.buildMoleculeBuilder(step, id);

      default:
        return `<p class="text-slate-500">Unbekannter Aufgabentyp.</p>`;
    }
  },

  // -------------------------------------------------------------------------
  // Challenge builders
  // -------------------------------------------------------------------------
  buildMultipleChoice(step, id) {
    return `
      <p class="text-lg font-bold text-slate-800 mb-6">${step.question}</p>
      <div class="space-y-3" id="options-${id}">
        ${step.options.map((opt, i) => `
          <button class="option-btn w-full text-left px-4 py-3 rounded-xl border border-amber-200 bg-white text-left" onclick="app.selectOption(${i})">
            ${opt}
          </button>
        `).join('')}
      </div>
      <p id="feedback-${id}" class="mt-4 text-sm font-medium hidden"></p>
    `;
  },

  buildDragDrop(step, id) {
    return `
      <p class="text-lg font-bold text-slate-800 mb-6">${step.question}</p>
      <div class="flex flex-col md:flex-row gap-6 items-start">
        <div class="flex-1 space-y-3">
          <span class="text-sm font-medium text-slate-500">Ziehe die Begriffe an die richtige Stelle:</span>
          <div id="draggables-${id}" class="space-y-2">
            ${step.items.map((item, i) => `
              <div class="draggable-item" draggable="true" data-index="${i}" data-value="${item.value}">
                ${item.label}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="flex-1 space-y-3">
          <span class="text-sm font-medium text-slate-500">Zielbereiche:</span>
          <div id="drops-${id}" class="grid grid-cols-1 gap-3">
            ${step.targets.map((t, i) => `
              <div class="drop-zone" data-target="${t.id}" ondrop="app.handleDrop(event, ${i})" ondragover="app.handleDragOver(event)" ondragleave="app.handleDragLeave(event)">
                ${t.label}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <p id="feedback-${id}" class="mt-4 text-sm font-medium hidden"></p>
    `;
  },

  buildMatching(step, id) {
    return `
      <p class="text-lg font-bold text-slate-800 mb-6">${step.question}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="matching-${id}">
        ${step.pairs.map((pair, i) => `
          <div class="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-white">
            <input type="radio" name="match-${id}" value="${i}" class="w-5 h-5 text-amber-600" onchange="app.selectMatch(${i})">
            <span class="text-slate-700">${pair.left}</span>
            <span class="ml-auto text-xs font-medium text-slate-400">↔</span>
            <span class="text-slate-700">${pair.right}</span>
          </div>
        `).join('')}
      </div>
      <p id="feedback-${id}" class="mt-4 text-sm font-medium hidden"></p>
    `;
  },

  buildMoleculeChoice(step, id) {
    return `
      <p class="text-lg font-bold text-slate-800 mb-6">${step.question}</p>
      <div class="molecule-viz" id="molecule-${id}">
        ${step.atoms.map(a => `<span class="atom atom-${a.type}">${a.symbol}</span>`).join('')}
      </div>
      <div class="mt-6 space-y-3" id="molecule-options-${id}">
        ${step.options.map((opt, i) => `
          <button class="option-btn w-full text-left px-4 py-3 rounded-xl border border-amber-200 bg-white text-left" onclick="app.selectMolecule(${i})">
            ${opt}
          </button>
        `).join('')}
      </div>
      <p id="feedback-${id}" class="mt-4 text-sm font-medium hidden"></p>
    `;
  },

  // -------------------------------------------------------------------------
  // Molecule Builder (new task type)
  // -------------------------------------------------------------------------
  buildMoleculeBuilder(step, id) {
    const difficulty = step.difficulty || 'medium';
    const difficultyLabel = {
      easy: 'Einfach – Grundgerüst vorgegeben',
      medium: 'Mittel – einige Atome vorgegeben',
      hard: 'Schwer – kompletter Freibau',
    }[difficulty];

    const difficultyClass = `difficulty-${difficulty}`;

    // Pre-placed atoms (for easy/medium difficulty)
    const preplacedAtoms = step.preplaced_atoms || [];
    const preplacedHtml = preplacedAtoms.map((a, i) => `
      <div class="atom-palette-item" onclick="app.addAtomFromPalette('${a.type}', '${a.symbol}')" data-type="${a.type}">
        <div class="atom-palette-symbol">${a.symbol}</div>
        <div class="atom-palette-name">${a.name || a.type}</div>
      </div>
    `).join('');

    // Available atom types from palette
    const paletteAtoms = step.palette_atoms || [
      { type: 'carbon', symbol: 'C', name: 'Kohlenstoff' },
      { type: 'hydrogen', symbol: 'H', name: 'Wasserstoff' },
      { type: 'oxygen', symbol: 'O', name: 'Sauerstoff' },
      { type: 'nitrogen', symbol: 'N', name: 'Stickstoff' },
    ];

    const paletteHtml = paletteAtoms.map(a => `
      <div class="atom-palette-item" onclick="app.addAtomFromPalette('${a.type}', '${a.symbol}')" data-type="${a.type}">
        <div class="atom-palette-symbol">${a.symbol}</div>
        <div class="atom-palette-name">${a.name}</div>
      </div>
    `).join('');

    return `
      <div class="molecule-builder-container">
        <div class="flex items-center justify-between w-full max-w-2xl">
          <div>
            <p class="text-lg font-bold text-slate-800 mb-1">${step.question}</p>
            <div class="difficulty-badge ${difficultyClass}">
              ${difficultyLabel}
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-400">Atome: <span id="mb-atom-count-${id}">0</span></div>
            <div class="text-xs text-slate-400">Bindungen: <span id="mb-bond-count-${id}">0</span></div>
          </div>
        </div>

        <div class="molecule-canvas-wrapper" id="mb-canvas-wrapper-${id}">
          <svg class="molecule-svg" id="mb-svg-${id}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <g id="mb-bonds-${id}"></g>
            <g id="mb-atoms-${id}"></g>
          </svg>
          <div class="tooltip" id="mb-tooltip-${id}"></div>
        </div>

        <div class="atom-palette" id="mb-palette-${id}">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Bausteine:</span>
          ${preplacedHtml}
          ${paletteHtml}
        </div>

        <div class="builder-controls">
          <button class="btn-builder btn-add-atom" onclick="app.toggleBondMode()">
            <span>🔗</span> Bindungsmodus
          </button>
          <button class="btn-builder btn-remove" onclick="app.removeSelectedAtom()">
            <span>🗑️</span> Ausgewähltes entfernen
          </button>
          <button class="btn-builder btn-clear" onclick="app.clearMolecule()">
            <span>🧹</span> Alles löschen
          </button>
          <button class="btn-builder btn-check" onclick="app.validateMolecule()">
            <span>✅</span> Struktur prüfen
          </button>
        </div>

        <div id="mb-validation-${id}" class="validation-feedback hidden">
          <span class="validation-icon" id="mb-validation-icon-${id}">❓</span>
          <span class="validation-message" id="mb-validation-message-${id}"></span>
        </div>
      </div>
    `;
  },

  // -------------------------------------------------------------------------
  // Molecule Builder interaction
  // -------------------------------------------------------------------------
  initChallenge(step) {
    if (step.type === 'molecule_builder') {
      this.initMoleculeBuilder(step);
    } else {
      // Existing interactions
      document.querySelectorAll('.draggable-item').forEach(el => {
        el.addEventListener('dragstart', (e) => app.handleDragStart(e));
        el.addEventListener('dragend', (e) => app.handleDragEnd(e));
      });
    }
  },

  initMoleculeBuilder(step) {
    const id = `challenge-${this.currentChallengeIndex}`;
    const svg = document.getElementById(`mb-svg-${id}`);
    const wrapper = document.getElementById(`mb-canvas-wrapper-${id}`);

    // Reset builder state
    this.moleculeBuilder = {
      atoms: [],
      bonds: [],
      selectedAtomId: null,
      isBondMode: false,
      targetSmiles: step.target_smiles || null,
      targetAtoms: step.target_atoms || null,
      targetBonds: step.target_bonds || null,
      difficulty: step.difficulty || 'medium',
      svg: svg,
      svgPoint: svg.createSVGPoint(),
      bondLine: null,
      bondStartAtom: null,
    };

    // Add pre-placed atoms (easy/medium difficulty)
    const preplaced = step.preplaced_atoms || [];
    preplaced.forEach((a, i) => {
      this.addAtomToCanvas(a.type, a.symbol, a.x || 100 + i * 60, a.y || 200, true);
    });

    // Update counters
    this.updateMoleculeCounters(id);

    // Canvas click handler for bond creation
    wrapper.addEventListener('click', (e) => {
      if (e.target === wrapper || e.target.classList.contains('molecule-canvas-wrapper')) {
        // Click on empty canvas - deselect
        if (this.moleculeBuilder.isBondMode) {
          this.moleculeBuilder.selectedAtomId = null;
          this.updateAtomSelection();
          this.removeBondLine();
        }
      }
    });

    // Tooltip
    const tooltip = document.getElementById(`mb-tooltip-${id}`);
    wrapper.addEventListener('mousemove', (e) => {
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY + 15) + 'px';
    });
  },

  addAtomFromPalette(type, symbol) {
    const id = `challenge-${this.currentChallengeIndex}`;
    const svg = document.getElementById(`mb-svg-${id}`);
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    this.addAtomToCanvas(type, symbol, centerX, centerY, false);
    this.updateMoleculeCounters(id);
  },

  addAtomToCanvas(type, symbol, x, y, isPreplaced = false) {
    const id = `challenge-${this.currentChallengeIndex}`;
    const atomId = 'atom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    const elementColors = {
      carbon: '#e2e8f0',
      hydrogen: '#fef3c7',
      oxygen: '#fee2e2',
      nitrogen: '#dbeafe',
    };

    const elementTextColors = {
      carbon: '#475569',
      hydrogen: '#92400e',
      oxygen: '#991b1b',
      nitrogen: '#1e3a8a',
    };

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'atom-node' + (isPreplaced ? ' connected' : ''));
    g.setAttribute('data-id', atomId);
    g.setAttribute('data-type', type);
    g.setAttribute('transform', `translate(${x}, ${y})`);
    g.style.cursor = 'grab';

    // Atom circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '22');
    circle.setAttribute('fill', elementColors[type] || '#ffffff');
    circle.setAttribute('stroke', '#94a3b8');
    circle.setAttribute('stroke-width', '2');
    g.appendChild(circle);

    // Atom symbol
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'atom-label');
    text.setAttribute('fill', elementTextColors[type] || '#000000');
    text.textContent = symbol;
    g.appendChild(text);

    // Events
    g.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.handleAtomMouseDown(atomId, e);
    });
    g.addEventListener('mouseenter', () => {
      const tooltip = document.getElementById(`mb-tooltip-${id}`);
      tooltip.textContent = symbol;
      tooltip.classList.add('visible');
    });
    g.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById(`mb-tooltip-${id}`);
      tooltip.classList.remove('visible');
    });

    // Drag events
    g.addEventListener('dragstart', (e) => e.preventDefault());

    const atomsGroup = document.getElementById(`mb-atoms-${id}`);
    atomsGroup.appendChild(g);

    this.moleculeBuilder.atoms.push({
      id: atomId,
      x: x,
      y: y,
      type: type,
      symbol: symbol,
      element: type,
      preplaced: isPreplaced,
    });

    // Make draggable
    this.makeAtomDraggable(g, atomId);

    this.updateAtomSelection();
  },

  makeAtomDraggable(element, atomId) {
    const id = `challenge-${this.currentChallengeIndex}`;
    const svg = document.getElementById(`mb-svg-${id}`);
    let isDragging = false;
    let startX, startY, startTranslateX, startTranslateY;

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const point = svg.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const svgP = point.matrixTransform(svg.getScreenCTM().inverse());

      const dx = svgP.x - startX;
      const dy = svgP.y - startY;

      const atom = this.moleculeBuilder.atoms.find(a => a.id === atomId);
      if (atom) {
        atom.x = startTranslateX + dx;
        atom.y = startTranslateY + dy;
        element.setAttribute('transform', `translate(${atom.x}, ${atom.y})`);
        this.updateBonds();
      }

      // Update bond line if in bond mode
      if (this.moleculeBuilder.isBondMode && this.moleculeBuilder.bondLine) {
        const startAtom = this.moleculeBuilder.atoms.find(a => a.id === this.moleculeBuilder.bondStartAtom);
        if (startAtom) {
          this.moleculeBuilder.bondLine.setAttribute('x1', startAtom.x);
          this.moleculeBuilder.bondLine.setAttribute('y1', startAtom.y);
          this.moleculeBuilder.bondLine.setAttribute('x2', svgP.x);
          this.moleculeBuilder.bondLine.setAttribute('y2', svgP.y);
        }
      }
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // If in bond mode and we dragged, check if we landed on another atom
      if (this.moleculeBuilder.isBondMode && this.moleculeBuilder.bondStartAtom) {
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const svgP = point.matrixTransform(svg.getScreenCTM().inverse());

        // Check if near another atom
        const targetAtom = this.moleculeBuilder.atoms.find(a => {
          if (a.id === this.moleculeBuilder.bondStartAtom) return false;
          const dist = Math.hypot(svgP.x - a.x, svgP.y - a.y);
          return dist < 30;
        });

        if (targetAtom) {
          this.createBond(this.moleculeBuilder.bondStartAtom, targetAtom.id);
        }

        this.removeBondLine();
        this.moleculeBuilder.bondStartAtom = null;
        this.moleculeBuilder.isBondMode = false;
        this.updateBondModeButton();
      }
    };

    element.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (this.moleculeBuilder.isBondMode) {
        // Start bond creation
        this.moleculeBuilder.bondStartAtom = atomId;
        this.moleculeBuilder.selectedAtomId = atomId;
        this.updateAtomSelection();

        startX = e.clientX;
        startY = e.clientY;

        // Create temporary bond line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'bond-line hover');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', startX);
        line.setAttribute('y2', startY);
        const bondsGroup = document.getElementById(`mb-bonds-${id}`);
        bondsGroup.appendChild(line);
        this.moleculeBuilder.bondLine = line;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return;
      }

      // Select atom
      this.moleculeBuilder.selectedAtomId = atomId;
      this.updateAtomSelection();

      startX = e.clientX;
      startY = e.clientY;
      startTranslateX = this.moleculeBuilder.atoms.find(a => a.id === atomId).x;
      startTranslateY = this.moleculeBuilder.atoms.find(a => a.id === atomId).y;

      isDragging = true;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  },

  handleAtomMouseDown(atomId, e) {
    e.stopPropagation();
  },

  updateAtomSelection() {
    const id = `challenge-${this.currentChallengeIndex}`;
    const atoms = document.querySelectorAll(`#mb-atoms-${id} .atom-node`);
    atoms.forEach(el => {
      const aid = el.getAttribute('data-id');
      if (aid === this.moleculeBuilder.selectedAtomId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  },

  removeBondLine() {
    if (this.moleculeBuilder.bondLine) {
      this.moleculeBuilder.bondLine.remove();
      this.moleculeBuilder.bondLine = null;
    }
  },

  toggleBondMode() {
    this.moleculeBuilder.isBondMode = !this.moleculeBuilder.isBondMode;
    this.updateBondModeButton();

    if (!this.moleculeBuilder.isBondMode) {
      this.moleculeBuilder.selectedAtomId = null;
      this.removeBondLine();
      this.moleculeBuilder.bondStartAtom = null;
      this.updateAtomSelection();
    }
  },

  updateBondModeButton() {
    const btn = document.querySelector('.btn-add-atom');
    if (this.moleculeBuilder.isBondMode) {
      btn.style.background = '#fef3c7';
      btn.style.borderColor = '#f59e0b';
      btn.style.color = '#92400e';
    } else {
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  },

  createBond(atom1Id, atom2Id) {
    // Check if bond already exists
    const exists = this.moleculeBuilder.bonds.some(b =>
      (b.atom1Id === atom1Id && b.atom2Id === atom2Id) ||
      (b.atom1Id === atom2Id && b.atom2Id === atom1Id)
    );
    if (exists) return;

    const bondId = 'bond-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    this.moleculeBuilder.bonds.push({
      id: bondId,
      atom1Id: atom1Id,
      atom2Id: atom2Id,
      order: 1,
    });

    this.updateBonds();
    this.updateMoleculeCounters(`challenge-${this.currentChallengeIndex}`);
  },

  updateBonds() {
    const id = `challenge-${this.currentChallengeIndex}`;
    const bondsGroup = document.getElementById(`mb-bonds-${id}`);
    bondsGroup.innerHTML = '';

    this.moleculeBuilder.bonds.forEach(bond => {
      const a1 = this.moleculeBuilder.atoms.find(a => a.id === bond.atom1Id);
      const a2 = this.moleculeBuilder.atoms.find(a => a.id === bond.atom2Id);
      if (!a1 || !a2) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'bond-line');
      line.setAttribute('x1', a1.x);
      line.setAttribute('y1', a1.y);
      line.setAttribute('x2', a2.x);
      line.setAttribute('y2', a2.y);
      bondsGroup.appendChild(line);
    });
  },

  removeSelectedAtom() {
    if (!this.moleculeBuilder.selectedAtomId) return;

    const atomId = this.moleculeBuilder.selectedAtomId;

    // Remove bonds connected to this atom
    this.moleculeBuilder.bonds = this.moleculeBuilder.bonds.filter(b =>
      b.atom1Id !== atomId && b.atom2Id !== atomId
    );

    // Remove atom
    this.moleculeBuilder.atoms = this.moleculeBuilder.atoms.filter(a => a.id !== atomId);

    // Remove from DOM
    const id = `challenge-${this.currentChallengeIndex}`;
    const el = document.querySelector(`#mb-atoms-${id} [data-id="${atomId}"]`);
    if (el) el.remove();

    this.moleculeBuilder.selectedAtomId = null;
    this.updateBonds();
    this.updateAtomSelection();
    this.updateMoleculeCounters(id);
  },

  clearMolecule() {
    const id = `challenge-${this.currentChallengeIndex}`;
    this.moleculeBuilder.atoms = [];
    this.moleculeBuilder.bonds = [];
    this.moleculeBuilder.selectedAtomId = null;
    this.moleculeBuilder.bondStartAtom = null;
    this.moleculeBuilder.isBondMode = false;

    document.getElementById(`mb-atoms-${id}`).innerHTML = '';
    document.getElementById(`mb-bonds-${id}`).innerHTML = '';
    this.removeBondLine();
    this.updateAtomSelection();
    this.updateBondModeButton();
    this.updateMoleculeCounters(id);

    // Hide validation
    document.getElementById(`mb-validation-${id}`).classList.add('hidden');
  },

  updateMoleculeCounters(id) {
    document.getElementById(`mb-atom-count-${id}`).textContent = this.moleculeBuilder.atoms.length;
    document.getElementById(`mb-bond-count-${id}`).textContent = this.moleculeBuilder.bonds.length;
  },

  // -------------------------------------------------------------------------
  // Molecule validation
  // -------------------------------------------------------------------------
  validateMolecule() {
    const id = `challenge-${this.currentChallengeIndex}`;
    const validationEl = document.getElementById(`mb-validation-${id}`);
    const iconEl = document.getElementById(`mb-validation-icon-${id}`);
    const msgEl = document.getElementById(`mb-validation-message-${id}`);

    const targetSmiles = this.moleculeBuilder.targetSmiles;
    const targetAtoms = this.moleculeBuilder.targetAtoms;
    const targetBonds = this.moleculeBuilder.targetBonds;

    if (!targetSmiles && !targetAtoms) {
      // No target defined - accept any reasonable molecule
      if (this.moleculeBuilder.atoms.length === 0) {
        this.showValidation(validationEl, iconEl, msgEl, 'incorrect', '❌', 'Bau zuerst ein Molekül.');
        return;
      }
      this.showValidation(validationEl, iconEl, msgEl, 'correct', '✅', 'Molekül erstellt! (Kein Ziel definiert)');
      this.xp += 20;
      this.updateStatusBar();
      document.getElementById('continue-btn').classList.remove('hidden');
      return;
    }

    // Simple validation: compare atom counts and bond counts
    const userAtomCount = this.moleculeBuilder.atoms.length;
    const userBondCount = this.moleculeBuilder.bonds.length;

    let correct = false;
    let message = '';

    if (targetAtoms && targetBonds) {
      // Count atoms by type
      const userAtomTypes = {};
      this.moleculeBuilder.atoms.forEach(a => {
        userAtomTypes[a.type] = (userAtomTypes[a.type] || 0) + 1;
      });

      const targetAtomTypes = {};
      targetAtoms.forEach(a => {
        targetAtomTypes[a.type] = (targetAtomTypes[a.type] || 0) + 1;
      });

      const atomTypesMatch = JSON.stringify(userAtomTypes) === JSON.stringify(targetAtomTypes);
      const bondCountMatch = userBondCount === targetBonds.length;

      correct = atomTypesMatch && bondCountMatch;

      if (correct) {
        message = 'Richtig! Die Molekülstruktur stimmt.';
      } else {
        message = `Fast. Du hast ${userAtomCount} Atome und ${userBondCount} Bindungen. Ziel: ${targetAtoms.length} Atome und ${targetBonds.length} Bindungen.`;
      }
    } else if (targetSmiles) {
      // Simplified SMILES validation - just check atom count roughly
      const smilesAtomCount = (targetSmiles.match(/[CON]/g) || []).length;
      correct = userAtomCount === smilesAtomCount && userBondCount >= userAtomCount - 1;

      if (correct) {
        message = 'Richtig! Die Struktur entspricht dem Ziel-SMILES.';
      } else {
        message = `Noch nicht ganz. Ziel hat ca. ${smilesAtomCount} Atome. Du hast ${userAtomCount}.`;
      }
    }

    this.showValidation(validationEl, iconEl, msgEl, correct ? 'correct' : 'incorrect', correct ? '✅' : '❌', message);

    if (correct) {
      this.xp += 30;
      this.updateStatusBar();
      document.getElementById('continue-btn').classList.remove('hidden');
    } else {
      this.loseHeart();
    }
  },

  showValidation(el, iconEl, msgEl, type, icon, message) {
    el.classList.remove('hidden', 'correct', 'incorrect');
    el.classList.add(type);
    iconEl.textContent = icon;
    msgEl.textContent = message;
  },

  // -------------------------------------------------------------------------
  // Challenge interactions (existing)
  // -------------------------------------------------------------------------
  selectOption(index) {
    const step = this.currentLesson.steps[this.currentChallengeIndex];
    const correct = step.correctAnswerIndex;

    const buttons = document.querySelectorAll(`#options-challenge-${this.currentChallengeIndex} button`);
    buttons.forEach((btn, i) => {
      btn.classList.remove('selected', 'correct', 'wrong');
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      if (i === index && index !== correct) btn.classList.add('wrong');
      if (i === index && index === correct) btn.classList.add('selected');
    });

    const feedback = document.getElementById(`feedback-challenge-${this.currentChallengeIndex}`);
    feedback.classList.remove('hidden');
    feedback.textContent = index === correct ? 'Richtig! 🎉' : 'Fast, aber nicht ganz.';
    feedback.className = `mt-4 text-sm font-medium ${index === correct ? 'text-emerald-600' : 'text-rose-600'}`;

    if (index === correct) {
      this.xp += 10;
      this.updateStatusBar();
    } else {
      this.loseHeart();
    }

    document.getElementById('continue-btn').classList.remove('hidden');
  },

  selectMatch(index) {
    this.xp += 10;
    this.updateStatusBar();
    document.getElementById('continue-btn').classList.remove('hidden');
  },

  selectMolecule(index) {
    const step = this.currentLesson.steps[this.currentChallengeIndex];
    const correct = step.correctAnswerIndex;

    const buttons = document.querySelectorAll(`#molecule-options-challenge-${this.currentChallengeIndex} button`);
    buttons.forEach((btn, i) => {
      btn.classList.remove('selected', 'correct', 'wrong');
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      if (i === index && index !== correct) btn.classList.add('wrong');
    });

    const feedback = document.getElementById(`feedback-challenge-${this.currentChallengeIndex}`);
    feedback.classList.remove('hidden');
    feedback.textContent = index === correct ? 'Richtig! 🎉' : 'Falsche Molekülstruktur.';
    feedback.className = `mt-4 text-sm font-medium ${index === correct ? 'text-emerald-600' : 'text-rose-600'}`;

    if (index === correct) {
      this.xp += 10;
      this.updateStatusBar();
    } else {
      this.loseHeart();
    }

    document.getElementById('continue-btn').classList.remove('hidden');
  },

  handleDragOver(e) { e.preventDefault(); },
  handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); },
  handleDragStart(e) {
    app.dragData = { index: e.target.dataset.index, value: e.target.dataset.value };
    e.target.classList.add('dragging');
  },
  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    app.dragData = null;
  },
  handleDrop(e, targetIndex) {
    e.preventDefault();
    const zone = e.currentTarget;
    zone.classList.remove('drag-over');

    if (!app.dragData) return;

    const step = app.currentLesson.steps[app.currentChallengeIndex];
    const target = step.targets[targetIndex];
    const correctValue = target.correctValue;

    if (app.dragData.value === correctValue) {
      zone.classList.add('correct');
      zone.innerHTML = `<span class="text-emerald-600 font-bold">✅ ${target.label}</span>`;
      app.xp += 10;
      app.updateStatusBar();
    } else {
      zone.classList.add('wrong');
      app.loseHeart();
    }

    const draggable = document.querySelector(`[data-index="${app.dragData.index}"]`);
    if (draggable) draggable.remove();

    document.getElementById('continue-btn').classList.remove('hidden');
  },

  loseHeart() {
    this.hearts = Math.max(0, this.hearts - 1);
    this.updateStatusBar();
    if (this.hearts <= 0) {
      setTimeout(() => {
        document.getElementById('hearts-modal').classList.remove('hidden');
      }, 1000);
    }
  },

  nextStep() {
    this.currentChallengeIndex++;
    this.renderLessonStep();
  },

  // -------------------------------------------------------------------------
  // Completion
  // -------------------------------------------------------------------------
  finishLesson() {
    this.hideAllViews();
    document.getElementById('result-view').classList.remove('hidden');

    if (this.currentLessonIndex >= this.lessons.length - 1) {
      this.currentLessonIndex = this.lessons.length - 1;
    } else {
      this.currentLessonIndex++;
    }

    this.streak++;
    this.xp += 50;
    this.level = Math.floor(this.xp / 100) + 1;
    this.updateStatusBar();

    document.getElementById('result-emoji').textContent = '🎉';
    document.getElementById('result-title').textContent = 'Lektion abgeschlossen!';
    document.getElementById('result-message').textContent = `+50 XP • Streak: ${this.streak} Tag${this.streak !== 1 ? 'e' : ''}`;
  },

  continueSkillTree() {
    this.showSkillTree();
  },

  repeatLesson() {
    this.hideAllViews();
    document.getElementById('lesson-view').classList.remove('hidden');
    this.currentChallengeIndex = 0;
    this.renderLessonStep();
  },

  // -------------------------------------------------------------------------
  // Status bar
  // -------------------------------------------------------------------------
  updateStatusBar() {
    document.getElementById('hearts-display').textContent = '❤️'.repeat(this.hearts) + '🤍'.repeat(3 - this.hearts);
    document.getElementById('hearts-count').textContent = this.hearts;
    document.getElementById('streak-display').textContent = this.streak;
    document.getElementById('xp-display').textContent = this.xp;
  },

  // -------------------------------------------------------------------------
  // Demo fallback data
  // -------------------------------------------------------------------------
  getDemoLessons() {
    return [
      {
        $id: 'demo-1',
        title: 'Alkane & Kohlenwasserstoffe',
        icon: '🛢️',
        order: 1,
        steps: [
          {
            type: 'info',
            info: {
              title: 'Was sind Alkane?',
              content: 'Alkane sind gesättigte Kohlenwasserstoffe, die nur aus einfachen C-C- und C-H-Bindungen bestehen. Die allgemeine Formel lautet CₙH₂ₙ₊₂.'
            }
          },
          {
            type: 'multiple_choice',
            question: 'Welche Formel gehört zu Propan (C₃H₈)?',
            options: ['C₃H₈', 'C₃H₆', 'C₄H₁₀', 'C₂H₆'],
            correctAnswerIndex: 0
          },
          {
            type: 'drag_drop',
            question: 'Ordne die Kohlenwasserstoffe ihrer Formel zu:',
            items: [
              { label: 'Methan', value: 'CH₄' },
              { label: 'Ethan', value: 'C₂H₆' },
              { label: 'Propan', value: 'C₃H₈' }
            ],
            targets: [
              { id: 't1', label: 'Methan', correctValue: 'CH₄' },
              { id: 't2', label: 'Ethan', correctValue: 'C₂H₆' },
              { id: 't3', label: 'Propan', correctValue: 'C₃H₈' }
            ]
          },
          {
            type: 'molecule_builder',
            question: 'Baue Methan (CH₄): Ein Kohlenstoffatom mit vier Wasserstoffatomen.',
            difficulty: 'easy',
            target_smiles: 'C',
            target_atoms: [
              { type: 'carbon', x: 200, y: 200 },
              { type: 'hydrogen', x: 140, y: 160 },
              { type: 'hydrogen', x: 260, y: 160 },
              { type: 'hydrogen', x: 140, y: 240 },
              { type: 'hydrogen', x: 260, y: 240 },
            ],
            target_bonds: 4,
            preplaced_atoms: [
              { type: 'carbon', symbol: 'C', name: 'Kohlenstoff', x: 200, y: 200 },
            ],
            palette_atoms: [
              { type: 'hydrogen', symbol: 'H', name: 'Wasserstoff' },
            ],
          },
        ],
      },
      {
        $id: 'demo-2',
        title: 'Alkene & Doppelbindungen',
        icon: '🔗',
        order: 2,
        steps: [
          {
            type: 'info',
            info: {
              title: 'Alkene',
              content: 'Alkene enthalten mindestens eine C=C-Doppelbindung. Sie sind ungesättigt und reaktionsfreudiger als Alkane.'
            }
          },
          {
            type: 'molecule_builder',
            question: 'Baue Ethen (C₂H₄): Zwei Kohlenstoffatome mit einer Doppelbindung und vier Wasserstoffatomen.',
            difficulty: 'medium',
            target_smiles: 'C=C',
            target_atoms: [
              { type: 'carbon', x: 180, y: 200 },
              { type: 'carbon', x: 320, y: 200 },
              { type: 'hydrogen', x: 120, y: 160 },
              { type: 'hydrogen', x: 120, y: 240 },
              { type: 'hydrogen', x: 380, y: 160 },
              { type: 'hydrogen', x: 380, y: 240 },
            ],
            target_bonds: 5,
            preplaced_atoms: [
              { type: 'carbon', symbol: 'C', name: 'Kohlenstoff', x: 180, y: 200 },
              { type: 'carbon', symbol: 'C', name: 'Kohlenstoff', x: 320, y: 200 },
            ],
            palette_atoms: [
              { type: 'hydrogen', symbol: 'H', name: 'Wasserstoff' },
            ],
          },
        ],
      },
      {
        $id: 'demo-3',
        title: 'Alkohole & Funktionsgruppen',
        icon: '🧪',
        order: 3,
        steps: [
          {
            type: 'info',
            info: {
              title: 'Alkohole',
              content: 'Alkohole enthalten eine oder mehrere Hydroxylgruppen (-OH). Die einfachste Form ist Methanol (CH₃OH).'
            }
          },
          {
            type: 'molecule_builder',
            question: 'Baue Methanol (CH₃OH): Ein Kohlenstoff, drei Wasserstoffe und eine Hydroxygruppe (-OH).',
            difficulty: 'hard',
            target_smiles: 'CO',
            target_atoms: [
              { type: 'carbon', x: 200, y: 200 },
              { type: 'oxygen', x: 280, y: 200 },
              { type: 'hydrogen', x: 140, y: 160 },
              { type: 'hydrogen', x: 140, y: 240 },
              { type: 'hydrogen', x: 260, y: 160 },
              { type: 'hydrogen', x: 340, y: 200 },
            ],
            target_bonds: 5,
            preplaced_atoms: [],
            palette_atoms: [
              { type: 'carbon', symbol: 'C', name: 'Kohlenstoff' },
              { type: 'hydrogen', symbol: 'H', name: 'Wasserstoff' },
              { type: 'oxygen', symbol: 'O', name: 'Sauerstoff' },
            ],
          },
        ],
      },
    ];
  },

  // -------------------------------------------------------------------------
  // Initialize
  // -------------------------------------------------------------------------
  init() {
    this.updateStatusBar();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
  app.showHome();
});
