/**
 * ChemVibe – Gamified Frontend for Organic Chemistry
 * Duolingo-style learning experience with Appwrite integration.
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

      case 'drag_drop':
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

      case 'matching':
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

      case 'molecule':
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

      default:
        return `<p class="text-slate-500">Unbekannter Aufgabentyp.</p>`;
    }
  },

  // -------------------------------------------------------------------------
  // Challenge interactions
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

  initChallenge(step) {
    document.querySelectorAll('.draggable-item').forEach(el => {
      el.addEventListener('dragstart', (e) => app.handleDragStart(e));
      el.addEventListener('dragend', (e) => app.handleDragEnd(e));
    });
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
          }
        ]
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
            type: 'molecule',
            question: 'Welches Molekül ist Ethen?',
            atoms: [
              { type: 'carbon', symbol: 'C' },
              { type: 'carbon', symbol: 'C' },
              { type: 'hydrogen', symbol: 'H' },
              { type: 'hydrogen', symbol: 'H' },
              { type: 'hydrogen', symbol: 'H' },
              { type: 'hydrogen', symbol: 'H' }
            ],
            options: ['C₂H₄ (Ethen)', 'C₂H₆ (Ethan)', 'C₃H₆ (Propen)'],
            correctAnswerIndex: 0
          }
        ]
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
            type: 'matching',
            question: 'Ordne die Funktionsgruppe zur Verbindung:',
            pairs: [
              { left: 'Ethanol', right: 'C₂H₅OH' },
              { left: 'Methanol', right: 'CH₃OH' },
              { left: 'Propanol', right: 'C₃H₇OH' }
            ]
          }
        ]
      }
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
