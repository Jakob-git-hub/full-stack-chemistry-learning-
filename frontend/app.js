/**
 * ChemVibe – Frontend Application
 * Appwrite SDK integration for fetching lessons from a database collection.
 */

// ---------------------------------------------------------------------------
// Appwrite configuration
// Replace these values with your own Appwrite project credentials.
// ---------------------------------------------------------------------------
const APPWRITE_CONFIG = {
  endpoint: 'https://cloud.appwrite.io/v1', // your Appwrite endpoint
  projectId: 'YOUR_PROJECT_ID',             // your Appwrite project ID
  databaseId: 'chemvibe',                   // database ID
  collectionId: 'lessons',                  // collection ID for lessons
};

// Initialize Appwrite SDK
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
  currentLesson: null,
  quizAnswers: {},

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  showHome() {
    this.hideAllSections();
    document.getElementById('home').classList.remove('hidden');
  },

  showDashboard() {
    this.hideAllSections();
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');
    this.loadLessons();
  },

  showLesson(lessonId) {
    const lesson = this.lessons.find((l) => l.$id === lessonId);
    if (!lesson) return;

    this.currentLesson = lesson;
    this.quizAnswers = {};

    this.hideAllSections();
    const view = document.getElementById('lesson-view');
    view.classList.remove('hidden');

    // Populate header
    document.getElementById('lesson-category').textContent = lesson.category || 'Chemie';
    document.getElementById('lesson-title').textContent = lesson.title;
    document.getElementById('lesson-reading-time').textContent =
      lesson.readingTime ? `${lesson.readingTime} min Lesezeit` : '';

    // Populate content
    document.getElementById('lesson-content').innerHTML = lesson.content || '<p>Kein Inhalt verfügbar.</p>';

    // Reset quiz UI
    const quizContainer = document.getElementById('quiz-container');
    const quizSubmit = document.getElementById('quiz-submit');
    const quizResult = document.getElementById('quiz-result');

    quizContainer.innerHTML = '';
    quizSubmit.classList.add('hidden');
    quizResult.classList.add('hidden');
    quizResult.innerHTML = '';

    // Render quiz questions if present
    const questions = lesson.quizQuestions || [];
    if (questions.length > 0) {
      questions.forEach((q, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'glass-card p-6 rounded-2xl border border-amber-100 mb-4';

        const title = document.createElement('h3');
        title.className = 'text-lg font-bold text-slate-800 mb-4';
        title.textContent = `Frage ${index + 1}: ${q.question}`;
        questionEl.appendChild(title);

        const optionsList = document.createElement('div');
        optionsList.className = 'space-y-2';

        q.options.forEach((option, optIndex) => {
          const label = document.createElement('label');
          label.className =
            'quiz-option block w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-left cursor-pointer hover:bg-amber-50 transition';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `quiz-${lesson.$id}-q${index}`;
          radio.value = optIndex;
          radio.className = 'mr-3 text-amber-600';
          radio.addEventListener('change', () => {
            this.quizAnswers[index] = optIndex;
            // Visual feedback: mark selected
            document
              .querySelectorAll(`input[name="quiz-${lesson.$id}-q${index}"]`)
              .forEach((r) => {
                r.parentElement.classList.remove('selected');
              });
            label.classList.add('selected');
          });

          const text = document.createElement('span');
          text.textContent = option;

          label.appendChild(radio);
          label.appendChild(text);
          optionsList.appendChild(label);
        });

        questionEl.appendChild(optionsList);
        quizContainer.appendChild(questionEl);
      });

      quizSubmit.classList.remove('hidden');
      quizSubmit.onclick = () => this.submitQuiz();
    } else {
      quizSubmit.classList.add('hidden');
    }
  },

  hideAllSections() {
    document.getElementById('home').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('lesson-view').classList.add('hidden');
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
  },

  // -------------------------------------------------------------------------
  // Data loading (Appwrite)
  // -------------------------------------------------------------------------
  async loadLessons() {
    const skeletonLoader = document.getElementById('skeleton-loader');
    const lessonsGrid = document.getElementById('lessons-grid');
    const emptyState = document.getElementById('empty-state');

    skeletonLoader.classList.remove('hidden');
    lessonsGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
      // Fetch documents from Appwrite collection `lessons`
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collectionId,
        [Query.limit(100), Query.orderDesc('$createdAt')]
      );

      this.lessons = response.documents || [];
      this.renderLessons(this.lessons);
    } catch (error) {
      console.error('Fehler beim Laden der Lektionen aus Appwrite:', error);
      // Fallback: show demo lessons if Appwrite is not configured
      this.lessons = this.getDemoLessons();
      this.renderLessons(this.lessons, true);
    } finally {
      skeletonLoader.classList.add('hidden');
      lessonsGrid.classList.remove('hidden');
    }
  },

  renderLessons(lessons, isDemo = false) {
    const lessonsGrid = document.getElementById('lessons-grid');
    const emptyState = document.getElementById('empty-state');

    lessonsGrid.innerHTML = '';

    if (!lessons || lessons.length === 0) {
      lessonsGrid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    lessonsGrid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    const categoryColors = {
      'Anorganische Chemie': 'bg-amber-100 text-amber-700',
      'Organische Chemie': 'bg-rose-100 text-rose-700',
      'Physikalische Chemie': 'bg-indigo-100 text-indigo-700',
      Allgemein: 'bg-emerald-100 text-emerald-700',
    };

    lessons.forEach((lesson) => {
      const card = document.createElement('article');
      card.className =
        'glass-card p-6 rounded-2xl border border-amber-100 hover:shadow-xl transition cursor-pointer group';

      const categoryClass = categoryColors[lesson.category || 'Allgemein'] || 'bg-amber-100 text-amber-700';

      card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${categoryClass}">
            ${lesson.category || 'Allgemein'}
          </span>
          <span class="text-xs text-slate-400">${lesson.readingTime || '5'} min</span>
        </div>
        <h3 class="text-xl font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition">
          ${lesson.title}
        </h3>
        <p class="text-slate-600 text-sm mb-4 line-clamp-2">
          ${lesson.description || 'Entdecke die faszinierende Welt der Chemie in dieser Lektion.'}
        </p>
        <div class="flex items-center justify-between pt-4 border-t border-amber-50">
          <span class="text-sm font-medium text-slate-500">Lektion starten</span>
          <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </div>
      `;

      card.onclick = () => this.showLesson(lesson.$id);
      lessonsGrid.appendChild(card);
    });
  },

  // -------------------------------------------------------------------------
  // Quiz evaluation
  // -------------------------------------------------------------------------
  submitQuiz() {
    const questions = this.currentLesson.quizQuestions || [];
    let correct = 0;

    questions.forEach((q, index) => {
      const selected = this.quizAnswers[index];
      const correctIndex = q.correctAnswerIndex;

      if (selected === correctIndex) {
        correct++;
      }

      // Visual feedback on options
      const radios = document.querySelectorAll(`input[name="quiz-${this.currentLesson.$id}-q${index}"]`);
      radios.forEach((radio) => {
        const label = radio.parentElement;
        label.classList.remove('selected');
        if (parseInt(radio.value) === correctIndex) {
          label.classList.add('correct');
        } else if (parseInt(radio.value) === selected && selected !== correctIndex) {
          label.classList.add('wrong');
        }
        radio.disabled = true;
      });
    });

    const percentage = Math.round((correct / questions.length) * 100);
    const resultEl = document.getElementById('quiz-result');
    const submitBtn = document.getElementById('quiz-submit');

    submitBtn.classList.add('hidden');

    let message = '';
    let icon = '';
    if (percentage === 100) {
      message = 'Perfekt! Du hast die Lektion gemeistert.';
      icon = '🎉';
    } else if (percentage >= 70) {
      message = 'Gut gemacht! Ein wenig mehr Übung und du bist ein Profi.';
      icon = '👍';
    } else {
      message = 'Nicht ganz. Schau dir die Lektion noch einmal an und versuche es erneut.';
      icon = '📚';
    }

    resultEl.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div class="text-4xl mb-3">${icon}</div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">Ergebnis: ${correct} / ${questions.length}</h3>
        <p class="text-slate-600 mb-4">${message}</p>
        <button onclick="app.showLesson('${this.currentLesson.$id}')" class="px-6 py-2 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition">
          Noch einmal versuchen
        </button>
      </div>
    `;
    resultEl.classList.remove('hidden');
  },

  // -------------------------------------------------------------------------
  // Demo fallback data (used when Appwrite is not configured)
  // -------------------------------------------------------------------------
  getDemoLessons() {
    return [
      {
        $id: 'demo-1',
        title: 'Das Periodensystem verstehen',
        category: 'Anorganische Chemie',
        description: 'Lerne die Struktur des Periodensystems und die wichtigsten Elemente kennen.',
        readingTime: 8,
        content: `
          <h2>Das Periodensystem der Elemente</h2>
          <p>Das Periodensystem ordnet alle bekannten chemischen Elemente nach ihrer Ordnungszahl und ihren Eigenschaften an.</p>
          <p>Elemente in derselben Spalte (Gruppe) haben ähnliche chemische Eigenschaften, da sie die gleiche Anzahl an Valenzelektronen besitzen.</p>
          <ul>
            <li><strong>Perioden</strong> sind die waagerechten Reihen.</li>
            <li><strong>Gruppen</strong> sind die senkrechten Spalten.</li>
            <li>Edelgase (Gruppe 18) sind besonders reaktionsträge.</li>
          </ul>
        `,
        quizQuestions: [
          {
            question: 'Was ordnet die Elemente im Periodensystem primär an?',
            options: ['Nach der Ordnungszahl', 'Nach dem Namen', 'Nach der Farbe', 'Nach dem Gewicht'],
            correctAnswerIndex: 0,
          },
          {
            question: 'Welche Gruppe ist besonders reaktionsträge?',
            options: ['Alkalimetalle', 'Halogene', 'Edelgase', 'Übergangsmetalle'],
            correctAnswerIndex: 2,
          },
        ],
      },
      {
        $id: 'demo-2',
        title: 'Chemische Bindungen',
        category: 'Allgemein',
        description: 'Wie Atome sich verbinden und Moleküle bilden.',
        readingTime: 10,
        content: `
          <h2>Chemische Bindungen</h2>
          <p>Atome verbinden sich zu Molekülen durch chemische Bindungen. Die zwei wichtigsten Arten sind ionische und kovalente Bindungen.</p>
          <p>Bei einer <strong>kovalenten Bindung</strong> teilen sich Atome Elektronenpaare. Bei einer <strong>ionischen Bindung</strong> werden Elektronen von einem Atom zum anderen übertragen.</p>
        `,
        quizQuestions: [
          {
            question: 'Was passiert bei einer kovalenten Bindung?',
            options: [
              'Elektronen werden übertragen',
              'Elektronenpaare werden geteilt',
              'Keine Wechselwirkung',
              'Nur Ionen sind beteiligt',
            ],
            correctAnswerIndex: 1,
          },
        ],
      },
      {
        $id: 'demo-3',
        title: 'Säuren und Basen',
        category: 'Allgemein',
        description: 'Der pH-Wert und die Eigenschaften von Säuren und Basen.',
        readingTime: 6,
        content: `
          <h2>Säuren und Basen</h2>
          <p>Der pH-Wert gibt an, wie sauer oder basisch eine Lösung ist. Er reicht von 0 (sehr sauer) bis 14 (sehr basisch).</p>
          <p>Ein pH-Wert von 7 ist neutral (z. B. reines Wasser).</p>
        `,
        quizQuestions: [
          {
            question: 'Welcher pH-Wert ist neutral?',
            options: ['0', '7', '14', '1'],
            correctAnswerIndex: 1,
          },
        ],
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  app.showHome();
});