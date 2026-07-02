/**
 * AI Study Assistant - Main Core Controller
 * Handles application lifecycle, UI interactions, navigation, storage,
 * and integrates the PDF.js and Gemini API clients.
 */

import {
  getGeminiApiKey,
  setGeminiApiKey,
  hasGeminiApiKey,
  generateStudyContent
} from './api.js';

import {
  extractTextFromPdf
} from './pdf.js';

// Global Application State
const state = {
  activeStage: 'dashboard',
  theme: 'theme-dark',
  fontSize: 'fs-medium',
  streak: 0,
  streakLastUpdated: '',
  pomodoro: {
    minutes: 25,
    seconds: 0,
    isActive: false,
    mode: 'study', // 'study', 'break', 'longBreak'
    completedToday: 0,
    totalMinutesToday: 0,
    intervalId: null,
    totalDurationSeconds: 1500
  },
  planner: [],
  flashcards: [],
  currentFlashcardIndex: 0,
  chat: {
    threads: [],
    activeThreadId: null
  },
  quiz: {
    questions: [],
    currentIndex: 0,
    score: 0,
    timerSeconds: 0,
    intervalId: null,
    isAnswered: false,
    startTime: null
  },
  studySessions: [] // Logs study session history for analytics chart
};

// Initial Default Data (to ensure the app looks alive and useful on first run)
const DEFAULT_FLASHCARDS = [
  { question: 'What is Mitochondria?', answer: 'The powerhouse of the cell, generating most of the cell\'s chemical energy (ATP).' },
  { question: 'What is Photosynthesis?', answer: 'The chemical process used by plants to convert solar energy, water, and carbon dioxide into oxygen and energy-rich sugars.' },
  { question: 'What does CPU stand for?', answer: 'Central Processing Unit. It acts as the primary "brain" of a computer, executing instructions of computer programs.' },
  { question: 'Define Inflation in Economics', answer: 'The general, sustained increase in prices across an economy over a period of time, leading to a decrease in purchasing power.' },
  { question: 'What is a Mnemonic Device?', answer: 'A learning technique or memory aid (such as a rhyme or acronym) that helps people recall large pieces of information.' }
];

const DEFAULT_TASKS = [
  { id: 'task-1', title: 'Check out the AI Study Assistant dashboard', day: 'today', category: 'general', completed: true },
  { id: 'task-2', title: 'Paste a Gemini API key in Settings to unlock AI', day: 'today', category: 'general', completed: false },
  { id: 'task-3', title: 'Generate your first study quiz with AI', day: 'tomorrow', category: 'science', completed: false },
  { id: 'task-4', title: 'Complete a 25-minute Pomodoro study block', day: 'week', category: 'math', completed: false }
];

// 7-day study log mock history to populate the chart initially
const DEFAULT_STUDY_SESSIONS = [
  { date: '06/25', minutes: 45 },
  { date: '06/26', minutes: 30 },
  { date: '06/27', minutes: 60 },
  { date: '06/28', minutes: 25 },
  { date: '06/29', minutes: 90 },
  { date: '06/30', minutes: 40 },
  { date: '07/01', minutes: 0 } // Today
];

/* ==========================================================================
   INITIALIZATION & STATE MANAGERS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  initializeThemeAndSizing();
  renderAppMetadata();
  renderAllActiveModules();
  setupSidebarNavigation();
  setupGlobalEventListeners();
  triggerLucideIcons();
  
  // Create first chat thread if none exist
  if (state.chat.threads.length === 0) {
    createNewChatThread('General Study Chat');
  } else {
    renderChatThreads();
  }
  
  // Render Custom HTML5 Canvas Activity Chart
  renderActivityChart();
  
  // Check and update streaks
  checkAndUpdateStreakOnLaunch();
  
  // Display helpful initial status toast
  if (!hasGeminiApiKey()) {
    showToast('Tutor Offline: Set your Gemini API key in Settings to unlock AI features!', 'info');
  } else {
    showToast('Welcome back to your Study Suite! AI Buddy is ready.', 'success');
  }
});

function loadStateFromStorage() {
  // Load Theme Sizing
  state.theme = localStorage.getItem('study_assistant_theme') || 'theme-dark';
  state.fontSize = localStorage.getItem('study_assistant_fontsize') || 'fs-medium';
  
  // Load Streak
  state.streak = parseInt(localStorage.getItem('study_assistant_streak') || '0', 10);
  state.streakLastUpdated = localStorage.getItem('study_assistant_streak_date') || '';

  // Load Pomodoro stats
  state.pomodoro.completedToday = parseInt(localStorage.getItem('study_assistant_pomo_count') || '0', 10);
  state.pomodoro.totalMinutesToday = parseInt(localStorage.getItem('study_assistant_pomo_mins') || '0', 10);

  // Load Planner
  const savedPlanner = localStorage.getItem('study_assistant_planner');
  state.planner = savedPlanner ? JSON.parse(savedPlanner) : DEFAULT_TASKS;

  // Load Flashcards
  const savedFlashcards = localStorage.getItem('study_assistant_flashcards');
  state.flashcards = savedFlashcards ? JSON.parse(savedFlashcards) : DEFAULT_FLASHCARDS;

  // Load Chat History
  const savedChats = localStorage.getItem('study_assistant_chats');
  state.chat.threads = savedChats ? JSON.parse(savedChats) : [];
  state.chat.activeThreadId = localStorage.getItem('study_assistant_active_chat_id') || null;

  // Load Study sessions activity logs
  const savedSessions = localStorage.getItem('study_assistant_sessions');
  state.studySessions = savedSessions ? JSON.parse(savedSessions) : DEFAULT_STUDY_SESSIONS;
}

function saveStateToStorage() {
  localStorage.setItem('study_assistant_theme', state.theme);
  localStorage.setItem('study_assistant_fontsize', state.fontSize);
  localStorage.setItem('study_assistant_streak', state.streak.toString());
  localStorage.setItem('study_assistant_streak_date', state.streakLastUpdated);
  localStorage.setItem('study_assistant_pomo_count', state.pomodoro.completedToday.toString());
  localStorage.setItem('study_assistant_pomo_mins', state.pomodoro.totalMinutesToday.toString());
  localStorage.setItem('study_assistant_planner', JSON.stringify(state.planner));
  localStorage.setItem('study_assistant_flashcards', JSON.stringify(state.flashcards));
  localStorage.setItem('study_assistant_chats', JSON.stringify(state.chat.threads));
  localStorage.setItem('study_assistant_active_chat_id', state.chat.activeThreadId || '');
  localStorage.setItem('study_assistant_sessions', JSON.stringify(state.studySessions));
}

function initializeThemeAndSizing() {
  // Apply current CSS classes to Body
  document.body.className = ''; // Reset
  document.body.classList.add(state.theme, state.fontSize, 'font-sans', 'antialiased', 'text-slate-100', 'bg-slate-950');
  
  // Set matching selectors in Settings
  const themeSelector = document.getElementById('settings-select-theme');
  const sizeSelector = document.getElementById('settings-select-fontsize');
  if (themeSelector) themeSelector.value = state.theme;
  if (sizeSelector) sizeSelector.value = state.fontSize;
}

function renderAppMetadata() {
  // Update header workspace date to Current Locale Date
  const dateEl = document.getElementById('workspace-date-text');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }

  // Update AI Connection Status badge based on key presence
  updateApiStatusIndicator();
}

function updateApiStatusIndicator() {
  const statusEl = document.getElementById('api-status-badge');
  const keyInput = document.getElementById('settings-api-key-input');
  const savedKey = getGeminiApiKey();
  
  if (statusEl) {
    if (savedKey) {
      statusEl.innerHTML = '<span class="status-dot status-online"></span> AI Connected (Custom)';
    } else {
      statusEl.innerHTML = '<span class="status-dot status-online" style="background-color: var(--accent);"></span> AI Connected (System)';
    }
  }
  
  if (keyInput) {
    if (savedKey) {
      keyInput.value = '••••••••••••••••••••••••••••••••';
    } else {
      keyInput.value = '';
      keyInput.placeholder = 'Optional - using built-in system key';
    }
  }
}

function triggerLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   UI NOTIFICATION SYSTEM (TOASTS)
   ========================================================================== */

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-wrapper');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message-item ${type}`;
  
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <span class="toast-text">${sanitizeHTML(message)}</span>
    <button class="toast-close-btn" aria-label="Close Toast"><i data-lucide="x"></i></button>
  `;

  container.appendChild(toast);
  triggerLucideIcons();

  // Attach manual remove click
  const closeBtn = toast.querySelector('.toast-close-btn');
  closeBtn.addEventListener('click', () => toast.remove());

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'toastEntry 0.3s reverse ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/* ==========================================================================
   NAVIGATION ENGINE
   ========================================================================== */

function setupSidebarNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sidebar = document.getElementById('app-sidebar');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetStage = item.getAttribute('data-target');
      
      // Close Sidebar on Mobile viewports after picking
      if (sidebar) sidebar.classList.remove('sidebar-open');
      
      switchStage(targetStage);
    });
  });

  // Mobile Menu toggles
  const mobToggle = document.getElementById('mobile-sidebar-toggle');
  const mobClose = document.getElementById('mobile-sidebar-close');

  if (mobToggle) {
    mobToggle.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('sidebar-open');
    });
  }

  if (mobClose) {
    mobClose.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('sidebar-open');
    });
  }
}

function switchStage(stageId) {
  state.activeStage = stageId;
  
  // Toggle Nav buttons
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-target') === stageId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle Stages visibility
  const stages = document.querySelectorAll('.content-stage');
  stages.forEach(stage => {
    if (stage.id === `stage-${stageId}`) {
      stage.classList.add('active');
    } else {
      stage.classList.remove('active');
    }
  });

  // Re-run triggers or render specific scripts per view
  if (stageId === 'dashboard') {
    renderDashboardProgress();
    renderActivityChart();
  }
  
  // Scroll main content area back to top
  const mainWorkspace = document.getElementById('main-workspace-scroll');
  if (mainWorkspace) mainWorkspace.scrollTop = 0;
  
  triggerLucideIcons();
}

/* ==========================================================================
   GLOBAL EVENT LISTENERS
   ========================================================================== */

function setupGlobalEventListeners() {
  // Bento Quick Actions
  const dbStartChat = document.getElementById('db-btn-quickstart-chat');
  const dbStartPlanner = document.getElementById('db-btn-quickstart-planner');
  const dbCreateTaskLink = document.getElementById('db-add-task-link');

  if (dbStartChat) dbStartChat.addEventListener('click', () => switchStage('chat'));
  if (dbStartPlanner) dbStartPlanner.addEventListener('click', () => switchStage('planner'));
  if (dbCreateTaskLink) dbCreateTaskLink.addEventListener('click', () => switchStage('planner'));

  // Chat Actions
  const clearChatHistoryBtn = document.getElementById('chat-clear-history');
  if (clearChatHistoryBtn) clearChatHistoryBtn.addEventListener('click', clearAllChatThreads);

  const newConvoBtn = document.getElementById('chat-new-convo-btn');
  if (newConvoBtn) {
    newConvoBtn.addEventListener('click', () => {
      const title = prompt('Enter conversation name:', 'Study Session #' + (state.chat.threads.length + 1));
      if (title) createNewChatThread(title);
    });
  }

  const chatForm = document.getElementById('chat-input-form');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleChatSubmit();
    });
  }

  const chatTextarea = document.getElementById('chat-user-message-input');
  if (chatTextarea) {
    chatTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChatSubmit();
      }
    });
  }

  // Tutorial Prompt Suggestions
  const suggestionBtns = document.querySelectorAll('.prompt-suggestion-btn');
  suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const promptText = btn.getAttribute('data-prompt');
      if (chatTextarea && promptText) {
        chatTextarea.value = promptText;
        chatTextarea.focus();
      }
    });
  });

  // Explain Module
  const explainForm = document.getElementById('explain-topic-form');
  if (explainForm) {
    explainForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleExplainSubmit();
    });
  }
  
  const explainCopy = document.getElementById('explain-btn-copy');
  if (explainCopy) {
    explainCopy.addEventListener('click', () => {
      const content = document.getElementById('explain-output-body').innerText;
      copyTextToClipboard(content, 'Explanation copied to clipboard!');
    });
  }

  const explainExport = document.getElementById('explain-btn-export');
  if (explainExport) {
    explainExport.addEventListener('click', () => {
      const title = document.getElementById('explain-output-title').textContent;
      const content = document.getElementById('explain-output-body').innerText;
      downloadTextFile(`${title.replace(/\s+/g, '_')}.txt`, `${title}\n\n${content}`);
    });
  }

  // Quiz Module Setup
  const quizForm = document.getElementById('quiz-generator-form');
  if (quizForm) {
    quizForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleQuizSubmit();
    });
  }

  const quizNextBtn = document.getElementById('quiz-next-question-btn');
  if (quizNextBtn) quizNextBtn.addEventListener('click', handleQuizNextQuestion);

  const quizRestartBtn = document.getElementById('quiz-restart-btn');
  if (quizRestartBtn) {
    quizRestartBtn.addEventListener('click', () => {
      document.getElementById('quiz-score-card').classList.add('hidden');
      document.getElementById('quiz-setup-card').classList.remove('hidden');
    });
  }

  // Summarizer Tab Toggles
  const tabNotes = document.getElementById('summarizer-tab-notes');
  const tabPdf = document.getElementById('summarizer-tab-pdf');
  const paneNotes = document.getElementById('tab-pane-notes');
  const panePdf = document.getElementById('tab-pane-pdf');

  if (tabNotes && tabPdf) {
    tabNotes.addEventListener('click', () => {
      tabNotes.classList.add('active');
      tabPdf.classList.remove('active');
      paneNotes.classList.add('active');
      panePdf.classList.remove('active');
    });

    tabPdf.addEventListener('click', () => {
      tabPdf.classList.add('active');
      tabNotes.classList.remove('active');
      panePdf.classList.add('active');
      paneNotes.classList.remove('active');
    });
  }

  // Notes Summarizer
  const notesSumForm = document.getElementById('notes-summarize-form');
  if (notesSumForm) {
    notesSumForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleNotesSummarizeSubmit();
    });
  }

  const summarizerCopy = document.getElementById('summarizer-btn-copy');
  if (summarizerCopy) {
    summarizerCopy.addEventListener('click', () => {
      const content = document.getElementById('summarizer-output-body').innerText;
      copyTextToClipboard(content, 'Summary copied to clipboard!');
    });
  }

  const summarizerExport = document.getElementById('summarizer-btn-export');
  if (summarizerExport) {
    summarizerExport.addEventListener('click', () => {
      const title = document.getElementById('summarizer-output-title').textContent;
      const content = document.getElementById('summarizer-output-body').innerText;
      downloadTextFile(`${title.replace(/\s+/g, '_')}.txt`, `${title}\n\n${content}`);
    });
  }

  // PDF Summarizer file actions
  const pdfDragZone = document.getElementById('pdf-drag-drop-zone');
  const pdfFilePicker = document.getElementById('pdf-file-picker');
  const pdfSelectedPane = document.getElementById('pdf-selected-file-pane');
  const pdfCancelBtn = document.getElementById('pdf-btn-cancel');
  const pdfProcessBtn = document.getElementById('pdf-btn-process');

  let activePdfFile = null;

  if (pdfDragZone && pdfFilePicker) {
    pdfDragZone.addEventListener('click', () => pdfFilePicker.click());
    
    pdfFilePicker.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handlePdfSelection(e.target.files[0]);
      }
    });

    // Drag over styling
    pdfDragZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pdfDragZone.classList.add('drag-over');
    });

    pdfDragZone.addEventListener('dragleave', () => {
      pdfDragZone.classList.remove('drag-over');
    });

    pdfDragZone.addEventListener('drop', (e) => {
      e.preventDefault();
      pdfDragZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        handlePdfSelection(e.dataTransfer.files[0]);
      }
    });
  }

  function handlePdfSelection(file) {
    if (file.type !== 'application/pdf') {
      showToast('Unsupported file type. Please upload a standard PDF.', 'error');
      return;
    }
    
    // Check sizing
    if (file.size > 10 * 1024 * 1024) {
      showToast('PDF size is too large (max 10MB limit).', 'error');
      return;
    }

    activePdfFile = file;
    document.getElementById('pdf-meta-name').textContent = file.name;
    document.getElementById('pdf-meta-size').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    pdfDragZone.classList.add('hidden');
    pdfSelectedPane.classList.remove('hidden');
  }

  if (pdfCancelBtn) {
    pdfCancelBtn.addEventListener('click', () => {
      activePdfFile = null;
      pdfSelectedPane.classList.add('hidden');
      pdfDragZone.classList.remove('hidden');
      if (pdfFilePicker) pdfFilePicker.value = '';
    });
  }

  if (pdfProcessBtn) {
    pdfProcessBtn.addEventListener('click', async () => {
      if (!activePdfFile) return;
      
      const loader = document.getElementById('pdf-extraction-loader-bar');
      const loaderText = document.getElementById('pdf-extraction-status-text');
      const summarizeOut = document.getElementById('summarizer-output-card');
      const skeletons = document.getElementById('summarizer-loading-skeleton');

      try {
        loader.classList.remove('hidden');
        summarizeOut.classList.add('hidden');
        
        // Extract PDF pages
        const extractedText = await extractTextFromPdf(activePdfFile, (current, total) => {
          if (loaderText) {
            loaderText.textContent = `PDF.js parsed page ${current} of ${total}...`;
          }
        });

        loader.classList.add('hidden');
        skeletons.classList.remove('hidden');

        // Request Summary from AI
        const systemPrompt = 'You are an academic textbook summarizing expert. Structure your summary into: (1) Core Document Concept, (2) Detailed Bullet Explanations of core themes, and (3) A small glossary definition of any key terms.';
        const result = await generateStudyContent(`Summarize the following PDF text extraction. Extract the absolute core study details:\n\n${extractedText}`, systemPrompt);
        
        document.getElementById('summarizer-output-title').textContent = activePdfFile.name;
        document.getElementById('summarizer-output-subtitle').textContent = `Extracted summary containing ${extractedText.split(' ').length} parsed words`;
        
        const outputBody = document.getElementById('summarizer-output-body');
        outputBody.innerHTML = renderMarkdown(result);

        skeletons.classList.add('hidden');
        summarizeOut.classList.remove('hidden');
        showToast('PDF Summary constructed successfully!', 'success');

      } catch (err) {
        loader.classList.add('hidden');
        skeletons.classList.add('hidden');
        console.error(err);
        showToast(`PDF Summarization Failed: ${err.message}`, 'error');
      }
    });
  }

  // Flashcards Handlers
  const fcCard = document.getElementById('flashcard-active-element');
  if (fcCard) {
    fcCard.addEventListener('click', () => {
      fcCard.classList.toggle('flipped');
    });
  }

  const fcPrev = document.getElementById('flashcard-btn-prev');
  const fcNext = document.getElementById('flashcard-btn-next');
  const fcShuffle = document.getElementById('flashcard-btn-shuffle');
  const fcClear = document.getElementById('flashcard-btn-clear');

  if (fcPrev) fcPrev.addEventListener('click', () => navigateFlashcard(-1));
  if (fcNext) fcNext.addEventListener('click', () => navigateFlashcard(1));
  
  if (fcShuffle) {
    fcShuffle.addEventListener('click', () => {
      if (state.flashcards.length < 2) return;
      
      // Fisher-Yates Shuffle
      for (let i = state.flashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.flashcards[i], state.flashcards[j]] = [state.flashcards[j], state.flashcards[i]];
      }
      state.currentFlashcardIndex = 0;
      renderFlashcardsDeck();
      showToast('Flashcard deck shuffled!', 'success');
    });
  }

  if (fcClear) {
    fcClear.addEventListener('click', () => {
      if (confirm('Are you sure you want to restore the default flashcard deck?')) {
        state.flashcards = [...DEFAULT_FLASHCARDS];
        state.currentFlashcardIndex = 0;
        saveStateToStorage();
        renderFlashcardsDeck();
        showToast('Deck reset to default state.', 'info');
      }
    });
  }

  // Flashcards CRUD Panels
  const fcAddBtn = document.getElementById('flashcard-add-custom-btn');
  const fcAddModal = document.getElementById('flashcard-add-modal-panel');
  const fcAddClose = document.getElementById('flashcard-add-modal-close');
  const fcForm = document.getElementById('flashcard-create-form');

  if (fcAddBtn && fcAddModal && fcAddClose) {
    fcAddBtn.addEventListener('click', () => {
      fcAddModal.classList.toggle('hidden');
      document.getElementById('flashcard-ai-modal-panel').classList.add('hidden');
    });
    fcAddClose.addEventListener('click', () => fcAddModal.classList.add('hidden'));
  }

  if (fcForm) {
    fcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('fc-create-question').value;
      const a = document.getElementById('fc-create-answer').value;
      
      state.flashcards.push({ question: q, answer: a });
      state.currentFlashcardIndex = state.flashcards.length - 1;
      
      saveStateToStorage();
      renderFlashcardsDeck();
      fcAddModal.classList.add('hidden');
      fcForm.reset();
      showToast('Added new custom flashcard!', 'success');
    });
  }

  // Flashcards AI generation
  const fcAiBtn = document.getElementById('flashcard-ai-generate-btn');
  const fcAiModal = document.getElementById('flashcard-ai-modal-panel');
  const fcAiClose = document.getElementById('flashcard-ai-modal-close');
  const fcAiForm = document.getElementById('flashcard-ai-form');

  if (fcAiBtn && fcAiModal && fcAiClose) {
    fcAiBtn.addEventListener('click', () => {
      if (!hasGeminiApiKey()) {
        showToast('Please set your Gemini API key in Settings first.', 'error');
        return;
      }
      fcAiModal.classList.toggle('hidden');
      fcAddModal.classList.add('hidden');
    });
    fcAiClose.addEventListener('click', () => fcAiModal.classList.add('hidden'));
  }

  if (fcAiForm) {
    fcAiForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subject = document.getElementById('fc-ai-subject').value;
      const submitBtn = document.getElementById('fc-ai-submit');
      
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="loading-bar-spinner"></i> Generating...';

        const prompt = `Generate exactly 5 essential study flashcards on the following topic: "${subject}". Returns a raw JSON array of objects, each object containing exact properties: "question" (the question or key term on front) and "answer" (definition or detailed answer on back). Do not output markdown decorators or triple-backticks. Only valid JSON.`;
        const rawJson = await generateStudyContent(prompt, 'You are a professional study helper who outputs raw, valid, minified JSON array objects only.', true);
        
        // Parse results
        const cards = JSON.parse(rawJson);
        if (Array.isArray(cards)) {
          cards.forEach(c => {
            if (c.question && c.answer) {
              state.flashcards.push({ question: c.question, answer: c.answer });
            }
          });
          state.currentFlashcardIndex = state.flashcards.length - 5;
          saveStateToStorage();
          renderFlashcardsDeck();
          fcAiModal.classList.add('hidden');
          fcAiForm.reset();
          showToast(`Generated and added 5 new flashcards on ${subject}!`, 'success');
        }
      } catch (err) {
        console.error(err);
        showToast(`AI Generation failed: ${err.message}`, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="sparkles"></i> Generate 5 Cards';
        triggerLucideIcons();
      }
    });
  }

  // Planner Task CRUDs
  const plannerForm = document.getElementById('planner-add-task-form');
  if (plannerForm) {
    plannerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('task-input-title').value;
      const day = document.getElementById('task-input-day').value;
      const category = document.getElementById('task-input-category').value;

      const newTask = {
        id: 'task-' + Date.now(),
        title,
        day,
        category,
        completed: false
      };

      state.planner.push(newTask);
      saveStateToStorage();
      renderPlannerBoard();
      plannerForm.reset();
      showToast('New study task added!', 'success');
    });
  }

  const clearCompletedPlannerBtn = document.getElementById('planner-clear-completed');
  if (clearCompletedPlannerBtn) {
    clearCompletedPlannerBtn.addEventListener('click', () => {
      const initialCount = state.planner.length;
      state.planner = state.planner.filter(t => !t.completed);
      const removed = initialCount - state.planner.length;
      
      saveStateToStorage();
      renderPlannerBoard();
      showToast(`Cleared ${removed} completed tasks from checklists.`, 'info');
    });
  }

  // Planner filters
  const filterAllBtn = document.getElementById('planner-filter-all');
  const filterTodayBtn = document.getElementById('planner-filter-today');

  if (filterAllBtn && filterTodayBtn) {
    filterAllBtn.addEventListener('click', () => {
      filterAllBtn.classList.add('active');
      filterTodayBtn.classList.remove('active');
      renderPlannerBoard('all');
    });

    filterTodayBtn.addEventListener('click', () => {
      filterTodayBtn.classList.add('active');
      filterAllBtn.classList.remove('active');
      renderPlannerBoard('today');
    });
  }

  // Pomodoro Actions
  const pomoToggleBtn = document.getElementById('pomodoro-btn-toggle');
  const pomoResetBtn = document.getElementById('pomodoro-btn-reset');
  const pomoDbToggle = document.getElementById('db-timer-toggle');
  const pomoDbReset = document.getElementById('db-timer-reset');

  if (pomoToggleBtn) pomoToggleBtn.addEventListener('click', togglePomodoroTimer);
  if (pomoResetBtn) pomoResetBtn.addEventListener('click', resetPomodoroTimer);
  if (pomoDbToggle) pomoDbToggle.addEventListener('click', togglePomodoroTimer);
  if (pomoDbReset) pomoDbReset.addEventListener('click', resetPomodoroTimer);

  // Preset Focus Session Picker
  const presetBtns = [
    document.getElementById('pomo-preset-25'),
    document.getElementById('pomo-preset-5'),
    document.getElementById('pomo-preset-15'),
    document.getElementById('pomo-preset-custom')
  ];

  presetBtns.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const minutesAttr = btn.getAttribute('data-minutes');
      const customPanel = document.getElementById('pomodoro-custom-input-panel');

      if (minutesAttr === 'custom') {
        customPanel.classList.remove('hidden');
      } else {
        customPanel.classList.add('hidden');
        const mins = parseInt(minutesAttr, 10);
        const mode = btn.getAttribute('data-mode') || 'study';
        setPomodoroDuration(mins, mode);
      }
    });
  });

  const customApply = document.getElementById('pomo-custom-apply-btn');
  if (customApply) {
    customApply.addEventListener('click', () => {
      const inputVal = parseInt(document.getElementById('pomo-custom-input').value, 10);
      if (inputVal > 0 && inputVal <= 180) {
        setPomodoroDuration(inputVal, 'study');
        showToast(`Focus duration set to ${inputVal} minutes!`, 'info');
      } else {
        showToast('Please enter minutes between 1 and 180.', 'error');
      }
    });
  }

  // Settings Actions
  const apiForm = document.getElementById('settings-api-form');
  if (apiForm) {
    apiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const keyVal = document.getElementById('settings-api-key-input').value.trim();
      if (keyVal) {
        if (keyVal.includes('•')) {
          showToast('Existing API key is already saved.', 'info');
          return;
        }
        setGeminiApiKey(keyVal);
        updateApiStatusIndicator();
        showToast('Gemini API key saved successfully!', 'success');
      }
    });
  }

  const apiDelete = document.getElementById('settings-api-btn-remove');
  if (apiDelete) {
    apiDelete.addEventListener('click', () => {
      setGeminiApiKey('');
      updateApiStatusIndicator();
      showToast('API Key deleted. AI features locked.', 'info');
    });
  }

  // Toggle API Key visibility
  const apiToggleVis = document.getElementById('settings-api-key-toggle-visible');
  if (apiToggleVis) {
    apiToggleVis.addEventListener('click', () => {
      const keyInput = document.getElementById('settings-api-key-input');
      const icon = apiToggleVis.querySelector('i');
      
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        if (window.lucide) {
          apiToggleVis.innerHTML = '<i data-lucide="eye-off"></i>';
          triggerLucideIcons();
        }
      } else {
        keyInput.type = 'password';
        if (window.lucide) {
          apiToggleVis.innerHTML = '<i data-lucide="eye"></i>';
          triggerLucideIcons();
        }
      }
    });
  }

  // Sizing and Theme changes
  const themeSelector = document.getElementById('settings-select-theme');
  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      state.theme = e.target.value;
      saveStateToStorage();
      initializeThemeAndSizing();
      showToast('Theme updated!', 'success');
    });
  }

  const sizeSelector = document.getElementById('settings-select-fontsize');
  if (sizeSelector) {
    sizeSelector.addEventListener('change', (e) => {
      state.fontSize = e.target.value;
      saveStateToStorage();
      initializeThemeAndSizing();
      showToast('Font scale updated!', 'success');
    });
  }

  // Hard Reset
  const hardResetBtn = document.getElementById('settings-btn-hard-reset');
  if (hardResetBtn) {
    hardResetBtn.addEventListener('click', () => {
      if (confirm('CRITICAL: This will wipe all flashcards, plan checklists, history logs, and settings. Proceed?')) {
        localStorage.clear();
        showToast('All app data successfully cleared. Reloading...', 'error');
        setTimeout(() => location.reload(), 1500);
      }
    });
  }

  // Backup Export
  const backupExportBtn = document.getElementById('settings-btn-backup-export');
  if (backupExportBtn) {
    backupExportBtn.addEventListener('click', () => {
      const backupObj = {
        theme: state.theme,
        fontSize: state.fontSize,
        streak: state.streak,
        streakLastUpdated: state.streakLastUpdated,
        planner: state.planner,
        flashcards: state.flashcards,
        studySessions: state.studySessions,
        chats: state.chat.threads,
        pomo_count: state.pomodoro.completedToday,
        pomo_mins: state.pomodoro.totalMinutesToday
      };
      
      const fileData = JSON.stringify(backupObj, null, 2);
      downloadTextFile('AI_Study_Assistant_Backup.json', fileData);
      showToast('Backup JSON exported successfully!', 'success');
    });
  }

  // Backup Import
  const backupImporter = document.getElementById('settings-backup-file-uploader');
  if (backupImporter) {
    backupImporter.addEventListener('change', (e) => {
      if (e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = function(evt) {
        try {
          const parsed = JSON.parse(evt.target.result);
          
          if (parsed.planner && parsed.flashcards) {
            state.theme = parsed.theme || 'theme-dark';
            state.fontSize = parsed.fontSize || 'fs-medium';
            state.streak = parsed.streak || 0;
            state.streakLastUpdated = parsed.streakLastUpdated || '';
            state.planner = parsed.planner;
            state.flashcards = parsed.flashcards;
            state.studySessions = parsed.studySessions || DEFAULT_STUDY_SESSIONS;
            state.chat.threads = parsed.chats || [];
            state.pomodoro.completedToday = parsed.pomo_count || 0;
            state.pomodoro.totalMinutesToday = parsed.pomo_mins || 0;

            saveStateToStorage();
            initializeThemeAndSizing();
            renderAllActiveModules();
            showToast('Backup restored successfully!', 'success');
          } else {
            showToast('Invalid backup file. Missing core properties.', 'error');
          }
        } catch (err) {
          showToast('Failed to parse backup JSON file.', 'error');
        }
      };
      
      reader.readAsText(file);
    });
  }
}

/* ==========================================================================
   MODULE VIEW RENDERS
   ========================================================================== */

function renderAllActiveModules() {
  renderDashboardProgress();
  renderChatThreads();
  renderFlashcardsDeck();
  renderPlannerBoard();
  renderPomodoroStatsUI();
}

/* ==========================================================================
   1. DASHBOARD COMPONENT
   ========================================================================== */

function renderDashboardProgress() {
  // Update Header greetings and streak displays
  const headerStreakVal = document.getElementById('header-streak-value');
  const dbStreakDays = document.getElementById('db-streak-days');
  const dbStreakCircle = document.getElementById('db-streak-circle');
  
  const streakDays = state.streak;
  
  if (headerStreakVal) headerStreakVal.textContent = `${streakDays} Days`;
  if (dbStreakDays) dbStreakDays.textContent = streakDays.toString();

  // Streak Circular SVG stroke dash offset calculation
  if (dbStreakCircle) {
    const maxOffset = 251.2; // 2 * PI * r (r=40)
    // Map streak to circle fill (cap at 7 days for visual fullness)
    const factor = Math.min(streakDays, 7) / 7;
    const offset = maxOffset - (factor * maxOffset);
    dbStreakCircle.style.strokeDashoffset = offset;
  }

  // mini task list items
  const dbTaskList = document.getElementById('db-task-list');
  const dbPlannerCount = document.getElementById('db-planner-count');
  const dbPlannerProgress = document.getElementById('db-planner-progress');
  const dbPlannerProgressPercent = document.getElementById('db-planner-progress-percent');

  // Filter tasks slated for today
  const todaysTasks = state.planner.filter(t => t.day === 'today');
  const totalToday = todaysTasks.length;
  const doneToday = todaysTasks.filter(t => t.completed).length;
  const todayPercent = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

  if (dbPlannerCount) dbPlannerCount.textContent = `${doneToday}/${totalToday}`;
  if (dbPlannerProgress) dbPlannerProgress.style.width = `${todayPercent}%`;
  if (dbPlannerProgressPercent) dbPlannerProgressPercent.textContent = `${todayPercent}% Completed`;

  if (dbTaskList) {
    if (totalToday === 0) {
      dbTaskList.innerHTML = `
        <div class="empty-state-mini">
          <p>No study tasks scheduled for today.</p>
          <button class="link-btn" id="db-add-task-link">Create Task</button>
        </div>
      `;
      // Bind newly created element
      const link = dbTaskList.querySelector('#db-add-task-link');
      if (link) link.addEventListener('click', () => switchStage('planner'));
    } else {
      dbTaskList.innerHTML = todaysTasks.map(task => `
        <div class="mini-task-item ${task.completed ? 'done' : ''}">
          <i data-lucide="${task.completed ? 'check-circle' : 'circle'}" class="${task.completed ? 'text-primary-400' : 'text-slate-400'}"></i>
          <span>${sanitizeHTML(task.title)}</span>
        </div>
      `).join('');
      triggerLucideIcons();
    }
  }
}

/* Custom Pure HTML5 Canvas Study activity chart renderer */
function renderActivityChart() {
  const canvas = document.getElementById('db-study-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Make canvas crisp on Retina screens
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Grab session logs
  const sessions = state.studySessions;
  if (sessions.length === 0) return;

  // Chart boundaries
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Grid line axis scale settings
  const maxMins = Math.max(...sessions.map(s => s.minutes), 60); // min ceiling is 60m
  const yTicks = 4;

  // Draw Horizontal Gridlines & Y-Axis values
  ctx.strokeStyle = state.theme === 'theme-light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.fillStyle = state.theme === 'theme-light' ? '#475569' : '#9ca3af';
  ctx.font = '10px var(--font-mono)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxMins / yTicks) * i);
    const y = paddingTop + chartHeight - (i / yTicks) * chartHeight;
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    // Draw label
    ctx.fillText(`${val}m`, paddingLeft - 8, y);
  }

  // Draw Bars & X-Axis titles
  const barWidth = Math.min((chartWidth / sessions.length) * 0.5, 30);
  const colGap = chartWidth / sessions.length;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  sessions.forEach((sess, idx) => {
    const cx = paddingLeft + (idx * colGap) + (colGap / 2);
    const cy = paddingTop + chartHeight;
    const barHeight = (sess.minutes / maxMins) * chartHeight;
    const by = cy - barHeight;

    // Draw Rounded Bar
    const rx = cx - barWidth / 2;
    const radius = 6;

    // Create beautiful Gradient fills per bar
    const grad = ctx.createLinearGradient(rx, by, rx, cy);
    if (state.theme === 'theme-light') {
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#4f46e5');
    } else if (state.theme === 'theme-dracula') {
      grad.addColorStop(0, '#ff79c6');
      grad.addColorStop(1, '#bd93f9');
    } else {
      grad.addColorStop(0, '#818cf8');
      grad.addColorStop(1, '#4f46e5');
    }

    ctx.fillStyle = grad;

    if (barHeight > 0) {
      ctx.beginPath();
      ctx.roundRect(rx, by, barWidth, barHeight, [radius, radius, 0, 0]);
      ctx.fill();

      // Add soft glow on hover/active highlights
      ctx.shadowColor = state.theme === 'theme-light' ? 'transparent' : 'rgba(79, 70, 229, 0.35)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(rx, by, barWidth, barHeight, [radius, radius, 0, 0]);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset
    } else {
      // Draw a tiny empty marker point
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw X Axis dates
    ctx.fillStyle = state.theme === 'theme-light' ? '#475569' : '#9ca3af';
    ctx.fillText(sess.date, cx, cy + 8);
  });
}

/* ==========================================================================
   2. AI STUDY Buddy CHAT SYSTEM
   ========================================================================== */

function createNewChatThread(title) {
  const newThread = {
    id: 'convo-' + Date.now(),
    title,
    messages: [
      {
        id: 'msg-init',
        sender: 'bot',
        text: `Hey! I am your AI Study Assistant. I am ready to deep dive into your homework, solve questions, or formulate outlines. How are we studying today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };

  state.chat.threads.unshift(newThread);
  state.chat.activeThreadId = newThread.id;
  
  saveStateToStorage();
  renderChatThreads();
  renderChatActiveWindow();
  
  showToast(`Created new chat: "${title}"`, 'success');
}

function clearAllChatThreads() {
  if (confirm('Are you sure you want to wipe all study conversations?')) {
    state.chat.threads = [];
    state.chat.activeThreadId = null;
    createNewChatThread('General Study Chat');
  }
}

function renderChatThreads() {
  const container = document.getElementById('chat-threads-container');
  if (!container) return;

  container.innerHTML = state.chat.threads.map(thread => `
    <div class="thread-item ${thread.id === state.chat.activeThreadId ? 'active' : ''}" data-id="${thread.id}">
      <i data-lucide="message-square" class="thread-icon-sz"></i>
      <span class="thread-title">${sanitizeHTML(thread.title)}</span>
      <button class="thread-delete-btn" aria-label="Delete Thread" data-id="${thread.id}">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `).join('');

  triggerLucideIcons();

  // Attach click events to thread item selects
  const items = container.querySelectorAll('.thread-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      // Avoid firing thread select if delete button was clicked
      if (e.target.closest('.thread-delete-btn')) return;
      
      const threadId = item.getAttribute('data-id');
      state.chat.activeThreadId = threadId;
      saveStateToStorage();
      renderChatThreads();
      renderChatActiveWindow();
    });
  });

  // Attach click events to thread delete buttons
  const deleteBtns = container.querySelectorAll('.thread-delete-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const threadId = btn.getAttribute('data-id');
      deleteThread(threadId);
    });
  });
}

function deleteThread(threadId) {
  state.chat.threads = state.chat.threads.filter(t => t.id !== threadId);
  
  if (state.chat.activeThreadId === threadId) {
    state.chat.activeThreadId = state.chat.threads.length > 0 ? state.chat.threads[0].id : null;
  }

  if (state.chat.threads.length === 0) {
    createNewChatThread('General Study Chat');
  } else {
    saveStateToStorage();
    renderChatThreads();
    renderChatActiveWindow();
  }
}

function renderChatActiveWindow() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const activeThread = state.chat.threads.find(t => t.id === state.chat.activeThreadId);
  if (!activeThread) {
    container.innerHTML = '';
    return;
  }

  // Toggle Welcome Tutorial Card
  const tutorial = document.getElementById('chat-tutorial-panel');
  if (activeThread.messages.length <= 1) {
    if (tutorial) tutorial.classList.remove('hidden');
  } else {
    if (tutorial) tutorial.classList.add('hidden');
  }

  // Render messages
  container.innerHTML = '';
  if (tutorial && activeThread.messages.length <= 1) {
    container.appendChild(tutorial);
  }

  activeThread.messages.forEach(msg => {
    if (msg.id === 'msg-init' && activeThread.messages.length > 1) {
      // Skip default greeting if we already have a conversation going
      return;
    }

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.sender}`;
    bubble.id = msg.id;

    bubble.innerHTML = `
      <div class="message-avatar">
        <i data-lucide="${msg.sender === 'user' ? 'user' : 'bot'}"></i>
      </div>
      <div class="message-bubble-content">
        <div class="message-card">
          ${msg.sender === 'user' ? sanitizeHTML(msg.text) : renderMarkdown(msg.text)}
        </div>
        <span class="message-time">${msg.timestamp}</span>
      </div>
    `;

    container.appendChild(bubble);
  });

  triggerLucideIcons();
  scrollChatToBottom();
  setupCodeCopyButtons();
}

function scrollChatToBottom() {
  const pane = document.getElementById('chat-messages-container');
  if (pane) {
    pane.scrollTop = pane.scrollHeight;
  }
}

function setupCodeCopyButtons() {
  const btns = document.querySelectorAll('.code-copy-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const codeEl = document.getElementById(targetId);
      if (codeEl) {
        copyTextToClipboard(codeEl.innerText, 'Code snippet copied!');
      }
    });
  });
}

async function handleChatSubmit() {
  const input = document.getElementById('chat-user-message-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Clear Input immediately
  input.value = '';
  
  const activeThread = state.chat.threads.find(t => t.id === state.chat.activeThreadId);
  if (!activeThread) return;

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Append user message
  const userMsg = {
    id: 'msg-' + Date.now(),
    sender: 'user',
    text,
    timestamp
  };
  activeThread.messages.push(userMsg);
  
  // Set thread title if it was default
  if (activeThread.title.startsWith('General Study Chat') && activeThread.messages.length === 2) {
    activeThread.title = text.substring(0, 24) + (text.length > 24 ? '...' : '');
    renderChatThreads();
  }

  saveStateToStorage();
  renderChatActiveWindow();

  // Trigger Gemini API Request
  const indicator = document.getElementById('chat-typing-indicator');
  if (indicator) indicator.classList.remove('hidden');
  scrollChatToBottom();

  try {
    const systemPrompt = 'You are a highly encouraging, friendly, and expert AI Study Assistant. Explain concepts clearly, write structured study guides, formulate markdown summaries, and solve problems step-by-step. Use elegant Markdown presentation with titles, lists, and code blocks.';
    
    // Construct chat history context for Gemini
    const chatContext = activeThread.messages
      .slice(-10) // Grab last 10 messages for speed and context
      .map(m => `${m.sender === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
      .join('\n\n');

    const result = await generateStudyContent(chatContext, systemPrompt);
    
    // Append bot message
    const botMsg = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'bot',
      text: result,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    activeThread.messages.push(botMsg);
    saveStateToStorage();
    
    // Simulated smooth typing rendering
    if (indicator) indicator.classList.add('hidden');
    renderChatActiveWindow();

  } catch (err) {
    if (indicator) indicator.classList.add('hidden');
    console.error(err);
    
    let userFriendlyErr = err.message || 'Tutor ran into an error. Please verify your connection.';
    if (err.message === 'API_KEY_MISSING') {
      userFriendlyErr = 'Tutors offline: Please configure your personal Google Gemini API Key in Settings to unlock chat assistants.';
    } else if (err.message === 'INVALID_API_KEY') {
      userFriendlyErr = 'The Gemini API Key stored in Settings appears invalid. Please double check and save a new key.';
    } else if (err.message.startsWith('INVALID_API_KEY:')) {
      userFriendlyErr = `Invalid API Key: ${err.message.replace('INVALID_API_KEY:', '')}`;
    } else if (err.message === 'RATE_LIMIT_EXCEEDED') {
      userFriendlyErr = 'Tutor is receiving too many requests right now. Please take a short break and try again!';
    } else if (err.message.startsWith('API_ERROR:')) {
      userFriendlyErr = `Google API error: ${err.message.replace('API_ERROR:', '')}`;
    }
    
    // Append error response
    const botMsg = {
      id: 'msg-' + (Date.now() + 1),
      sender: 'bot',
      text: `⚠️ **API Error:** ${userFriendlyErr}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    activeThread.messages.push(botMsg);
    saveStateToStorage();
    renderChatActiveWindow();
  }
}

/* ==========================================================================
   3. EXPLAIN TOPIC COMPONENT
   ========================================================================== */

async function handleExplainSubmit() {
  const subjectInput = document.getElementById('explain-input-subject');
  const depthInput = document.getElementById('explain-input-depth');
  const skeletons = document.getElementById('explain-loading-skeleton');
  const outputCard = document.getElementById('explain-output-card');

  if (!subjectInput) return;

  const subject = subjectInput.value.trim();
  const depth = depthInput.value;

  if (!subject) return;

  // Toggle states
  skeletons.classList.remove('hidden');
  outputCard.classList.add('hidden');

  try {
    let depthDescriptor = 'beginner friendly and conceptual';
    if (depth === 'five-years-old') depthDescriptor = 'explained as if speaking to a 5-year-old using simple analogies and stories';
    if (depth === 'detailed') depthDescriptor = 'fully detailed study guide with clear sections, concepts, and real-world examples';
    if (depth === 'expert') depthDescriptor = 'rigorous academic and professional analysis, including technical terms, definitions, and theories';

    const systemPrompt = 'You are a master scientific and humanities educator. Your mission is to structure a perfectly clear explanation of topics.';
    const prompt = `Explain the topic: "${subject}" to a student. Sizing/depth level is: "${depthDescriptor}". Build the explanation with these exact header structures:
    
    1. Introduction Overview (Clear, easy explanation)
    2. Interactive Analogy (A beautiful, vivid real-world analogy to make it stick)
    3. Core Concepts Breakdown (Structured bullet list explaining terms)
    4. Summary Review (Fast takeaway summary)
    
    Write with clear Markdown headings.`;

    const result = await generateStudyContent(prompt, systemPrompt);

    // Populate and show output card
    document.getElementById('explain-output-title').textContent = `Topic: ${subject}`;
    
    const outputBody = document.getElementById('explain-output-body');
    outputBody.innerHTML = renderMarkdown(result);

    skeletons.classList.add('hidden');
    outputCard.classList.remove('hidden');
    showToast('Explanation formulated!', 'success');

    // Add study log minutes to analytics (approx 5 mins explaining topic)
    logStudyMinutes(5);

  } catch (err) {
    skeletons.classList.add('hidden');
    console.error(err);
    showToast(`Failed to generate explanation: ${err.message}`, 'error');
  }
}

/* ==========================================================================
   4. QUIZ GENERATOR COMPONENT
   ========================================================================== */

async function handleQuizSubmit() {
  const topicInput = document.getElementById('quiz-input-topic');
  const diffInput = document.getElementById('quiz-input-difficulty');
  const countInput = document.getElementById('quiz-input-count');
  
  const skeletons = document.getElementById('quiz-loading-skeleton');
  const setupCard = document.getElementById('quiz-setup-card');
  const gameCard = document.getElementById('quiz-game-card');

  if (!topicInput) return;

  const topic = topicInput.value.trim();
  const difficulty = diffInput.value;
  const count = parseInt(countInput.value, 10);

  if (!topic) return;

  setupCard.classList.add('hidden');
  skeletons.classList.remove('hidden');

  try {
    const systemPrompt = 'You are a multiple-choice academic quiz generator. You MUST output a raw, valid, minified JSON array of question objects only. No backticks. No markdown formatting.';
    const prompt = `Generate exactly ${count} multiple choice questions (MCQs) of "${difficulty}" difficulty on the topic/text: "${topic}". Each question object must feature these exact keys: "question" (string), "options" (array of 4 strings), "answer" (string matching exactly one of the options), and "explanation" (string giving feedback). Return only raw JSON.`;

    const rawJson = await generateStudyContent(prompt, systemPrompt, true);
    
    // Attempt parse
    const questions = JSON.parse(rawJson);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Parsed array is empty or invalid.');
    }

    // Set Quiz state
    state.quiz.questions = questions;
    state.quiz.currentIndex = 0;
    state.quiz.score = 0;
    state.quiz.timerSeconds = 0;
    state.quiz.isAnswered = false;
    state.quiz.startTime = Date.now();

    skeletons.classList.add('hidden');
    gameCard.classList.remove('hidden');

    startQuizTimer();
    renderActiveQuizQuestion();
    showToast('MCQ Quiz Generated successfully!', 'success');

  } catch (err) {
    skeletons.classList.add('hidden');
    setupCard.classList.remove('hidden');
    console.error(err);
    showToast(`Quiz Generation failed: ${err.message}`, 'error');
  }
}

function startQuizTimer() {
  if (state.quiz.intervalId) clearInterval(state.quiz.intervalId);
  
  const timerLabel = document.getElementById('quiz-timer-clock');
  state.quiz.timerSeconds = 0;

  state.quiz.intervalId = setInterval(() => {
    state.quiz.timerSeconds++;
    const mins = Math.floor(state.quiz.timerSeconds / 60);
    const secs = state.quiz.timerSeconds % 60;
    if (timerLabel) {
      timerLabel.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function renderActiveQuizQuestion() {
  const currentIdx = state.quiz.currentIndex;
  const question = state.quiz.questions[currentIdx];
  if (!question) return;

  state.quiz.isAnswered = false;

  // Update indexes
  document.getElementById('quiz-current-index').textContent = (currentIdx + 1).toString();
  document.getElementById('quiz-total-count').textContent = state.quiz.questions.length.toString();
  document.getElementById('quiz-active-question').textContent = question.question;

  // Hide feedback panel
  document.getElementById('quiz-feedback-panel').classList.add('hidden');

  // Render option buttons
  const optionsBox = document.getElementById('quiz-options-container');
  optionsBox.innerHTML = '';

  const alphabet = ['A', 'B', 'C', 'D'];
  question.options.forEach((opt, index) => {
    const optBtn = document.createElement('button');
    optBtn.className = 'quiz-option-btn';
    optBtn.innerHTML = `
      <div class="flex-row-center">
        <span class="quiz-option-letter">${alphabet[index]}</span>
        <span>${sanitizeHTML(opt)}</span>
      </div>
      <i class="quiz-opt-icon"></i>
    `;

    optBtn.addEventListener('click', () => handleQuizOptionSelect(optBtn, opt, question));
    optionsBox.appendChild(optBtn);
  });
}

function handleQuizOptionSelect(btnElement, selectedVal, question) {
  if (state.quiz.isAnswered) return; // Disallow double voting
  state.quiz.isAnswered = true;

  const correctVal = question.answer;
  const isCorrect = selectedVal === correctVal;

  if (isCorrect) {
    state.quiz.score++;
    btnElement.classList.add('correct');
    const icon = btnElement.querySelector('.quiz-opt-icon');
    if (icon && window.lucide) {
      icon.innerHTML = '<i data-lucide="check" class="text-green-500"></i>';
      triggerLucideIcons();
    }
  } else {
    btnElement.classList.add('incorrect');
    const icon = btnElement.querySelector('.quiz-opt-icon');
    if (icon && window.lucide) {
      icon.innerHTML = '<i data-lucide="x" class="text-rose-500"></i>';
      triggerLucideIcons();
    }
    
    // Highlight correct one
    const optionBtns = document.querySelectorAll('.quiz-option-btn');
    optionBtns.forEach(btn => {
      if (btn.innerText.includes(correctVal)) {
        btn.classList.add('correct');
      }
    });
  }

  // Render feedback panel
  const panel = document.getElementById('quiz-feedback-panel');
  const title = document.getElementById('quiz-feedback-title');
  const explanation = document.getElementById('quiz-feedback-explanation');

  title.textContent = isCorrect ? '🎉 Correct!' : '❌ Incorrect';
  title.className = `feedback-heading font-display ${isCorrect ? 'text-green-500' : 'text-rose-500'}`;
  explanation.textContent = question.explanation;

  panel.classList.remove('hidden');
}

function handleQuizNextQuestion() {
  state.quiz.currentIndex++;
  
  if (state.quiz.currentIndex < state.quiz.questions.length) {
    renderActiveQuizQuestion();
  } else {
    // End Quiz
    clearInterval(state.quiz.intervalId);
    document.getElementById('quiz-game-card').classList.add('hidden');
    
    const scoreCard = document.getElementById('quiz-score-card');
    const finalScore = document.getElementById('quiz-final-score');
    const finalPercent = document.getElementById('quiz-final-percentage');
    const finalTime = document.getElementById('quiz-final-time');

    const total = state.quiz.questions.length;
    const score = state.quiz.score;
    const percent = Math.round((score / total) * 100);

    finalScore.textContent = `${score} / ${total}`;
    finalPercent.textContent = `${percent}%`;
    finalTime.textContent = `${state.quiz.timerSeconds}s`;

    scoreCard.classList.remove('hidden');
    showToast('Quiz session finished! Results recorded.', 'success');

    // Add study log minutes (approx 5 mins completing a quiz)
    logStudyMinutes(5);
  }
}

/* ==========================================================================
   5. SUMMARIZERS COMPONENT
   ========================================================================== */

async function handleNotesSummarizeSubmit() {
  const notesText = document.getElementById('summarize-input-text').value.trim();
  const skeletons = document.getElementById('summarizer-loading-skeleton');
  const outputCard = document.getElementById('summarizer-output-card');

  if (notesText.length < 20) {
    showToast('Please paste a longer text to summarize.', 'error');
    return;
  }

  skeletons.classList.remove('hidden');
  outputCard.classList.add('hidden');

  try {
    const systemPrompt = 'You are an academic textbook summarizing expert. Structure your summary into: (1) Core lecture objective, (2) Key thematic summaries using structured bullet points, and (3) Any important glossary definitions.';
    const prompt = `Please summarize the following study notes:\n\n${notesText}`;

    const result = await generateStudyContent(prompt, systemPrompt);

    document.getElementById('summarizer-output-title').textContent = 'Study Summary';
    document.getElementById('summarizer-output-subtitle').textContent = `Summary of notes containing ${notesText.split(' ').length} words`;
    
    const outputBody = document.getElementById('summarizer-output-body');
    outputBody.innerHTML = renderMarkdown(result);

    skeletons.classList.add('hidden');
    outputCard.classList.remove('hidden');
    showToast('Summary formulated successfully!', 'success');

    // Add study log minutes (approx 10 mins reading notes)
    logStudyMinutes(10);

  } catch (err) {
    skeletons.classList.add('hidden');
    console.error(err);
    showToast(`Summarization Failed: ${err.message}`, 'error');
  }
}

/* ==========================================================================
   6. FLASHCARDS COMPONENT
   ========================================================================== */

function renderFlashcardsDeck() {
  const label = document.getElementById('flashcard-pagination-label');
  const pBar = document.getElementById('flashcard-progress-bar');
  const pLabel = document.getElementById('flashcard-progress-label');

  if (state.flashcards.length === 0) {
    document.getElementById('flashcard-front-content').textContent = 'No cards in deck!';
    document.getElementById('flashcard-back-content').textContent = 'Create some custom cards above!';
    if (label) label.textContent = '0 / 0';
    if (pBar) pBar.style.width = '0%';
    if (pLabel) pLabel.textContent = 'Deck Progress: 0%';
    return;
  }

  const activeIdx = state.currentFlashcardIndex;
  const card = state.flashcards[activeIdx];

  document.getElementById('flashcard-front-content').textContent = card.question;
  document.getElementById('flashcard-back-content').textContent = card.answer;

  // Unflip card if it was flipped
  const fcCard = document.getElementById('flashcard-active-element');
  if (fcCard) fcCard.classList.remove('flipped');

  // Update indexes
  const total = state.flashcards.length;
  if (label) label.textContent = `${activeIdx + 1} / ${total}`;
  
  // Update bars
  const progressPercent = Math.round(((activeIdx + 1) / total) * 100);
  if (pBar) pBar.style.width = `${progressPercent}%`;
  if (pLabel) pLabel.textContent = `Deck Progress: ${progressPercent}%`;
}

function navigateFlashcard(direction) {
  if (state.flashcards.length === 0) return;
  
  let targetIdx = state.currentFlashcardIndex + direction;
  
  if (targetIdx < 0) targetIdx = state.flashcards.length - 1;
  if (targetIdx >= state.flashcards.length) targetIdx = 0;

  state.currentFlashcardIndex = targetIdx;
  renderFlashcardsDeck();
}

/* ==========================================================================
   7. STUDY PLANNER COMPONENT
   ========================================================================== */

function renderPlannerBoard(filter = 'all') {
  const container = document.getElementById('planner-tasks-container');
  if (!container) return;

  const filteredTasks = state.planner.filter(t => {
    if (filter === 'today') return t.day === 'today';
    return true;
  });

  // Render Stats
  const total = state.planner.length;
  const done = state.planner.filter(t => t.completed).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('plan-stat-total').textContent = total.toString();
  document.getElementById('plan-stat-done').textContent = done.toString();
  document.getElementById('plan-stat-percent').textContent = `${percent}%`;

  if (filteredTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state-mini text-center padding-top-md">
        <i data-lucide="check-square" class="drag-icon text-slate-500"></i>
        <p>No study tasks scheduled for this checklist board.</p>
      </div>
    `;
    triggerLucideIcons();
    return;
  }

  container.innerHTML = filteredTasks.map(task => {
    let tagClass = 'gen';
    if (task.category === 'science') tagClass = 'sci';
    if (task.category === 'math') tagClass = 'mat';
    if (task.category === 'humanities') tagClass = 'hum';

    return `
      <div class="planner-task-item ${task.completed ? 'done' : ''}" data-id="${task.id}">
        <div class="task-checkbox-custom" aria-label="Toggle task checkbox">
          <i data-lucide="check"></i>
        </div>
        <div class="task-core-details">
          <span class="task-title-text">${sanitizeHTML(task.title)}</span>
          <div class="task-sub-info-row">
            <span class="task-tag ${tagClass}">${task.category}</span>
            <span class="task-due-date-lbl">Scheduled: ${task.day}</span>
          </div>
        </div>
        <button class="icon-btn task-del-btn" aria-label="Delete Task"><i data-lucide="trash-2"></i></button>
      </div>
    `;
  }).join('');

  triggerLucideIcons();

  // Attach Checkbox Events
  const checkboxes = container.querySelectorAll('.task-checkbox-custom');
  checkboxes.forEach(box => {
    box.addEventListener('click', (e) => {
      const parent = box.closest('.planner-task-item');
      const taskId = parent.getAttribute('data-id');
      toggleTaskCompletion(taskId);
    });
  });

  // Attach Delete Events
  const delBtns = container.querySelectorAll('.task-del-btn');
  delBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = btn.closest('.planner-task-item');
      const taskId = parent.getAttribute('data-id');
      deleteTask(taskId);
    });
  });
}

function toggleTaskCompletion(taskId) {
  const task = state.planner.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveStateToStorage();
    renderPlannerBoard();
    renderDashboardProgress();
    
    if (task.completed) {
      showToast('Study objective completed!', 'success');
    }
  }
}

function deleteTask(taskId) {
  state.planner = state.planner.filter(t => t.id !== taskId);
  saveStateToStorage();
  renderPlannerBoard();
  renderDashboardProgress();
  showToast('Study task removed.', 'info');
}

/* ==========================================================================
   8. POMODORO TIMER COMPONENT
   ========================================================================== */

function setPomodoroDuration(mins, mode) {
  state.pomodoro.minutes = mins;
  state.pomodoro.seconds = 0;
  state.pomodoro.mode = mode;
  state.pomodoro.totalDurationSeconds = mins * 60;
  
  updatePomodoroTimerDisplay();
  
  // Reset active state
  if (state.pomodoro.isActive) {
    togglePomodoroTimer();
  }
}

function togglePomodoroTimer() {
  const pomoBtn = document.getElementById('pomodoro-btn-toggle');
  const pomoDbToggle = document.getElementById('db-timer-toggle');

  state.pomodoro.isActive = !state.pomodoro.isActive;

  if (state.pomodoro.isActive) {
    // Start interval
    state.pomodoro.intervalId = setInterval(tickPomodoroSeconds, 1000);
    
    if (pomoBtn) {
      pomoBtn.innerHTML = '<i data-lucide="pause"></i> Pause Focusing';
      pomoBtn.classList.remove('primary-btn');
      pomoBtn.classList.add('secondary-btn');
    }
    if (pomoDbToggle) {
      pomoDbToggle.innerHTML = '<i data-lucide="pause"></i> Pause';
    }

    // Toggle live active badge in sidebar
    document.getElementById('sidebar-timer-badge').classList.remove('hidden');
    document.getElementById('mobile-pomodoro-badge').classList.remove('hidden');
    document.getElementById('header-pomodoro-card').classList.remove('hidden');
  } else {
    // Pause interval
    clearInterval(state.pomodoro.intervalId);
    
    if (pomoBtn) {
      pomoBtn.innerHTML = '<i data-lucide="play"></i> Resume Focusing';
      pomoBtn.classList.remove('secondary-btn');
      pomoBtn.classList.add('primary-btn');
    }
    if (pomoDbToggle) {
      pomoDbToggle.innerHTML = '<i data-lucide="play"></i> Resume';
    }

    document.getElementById('sidebar-timer-badge').classList.add('hidden');
  }

  triggerLucideIcons();
}

function tickPomodoroSeconds() {
  if (state.pomodoro.seconds === 0) {
    if (state.pomodoro.minutes === 0) {
      // Focus cycle complete!
      handleFocusCycleCompletion();
      return;
    }
    state.pomodoro.minutes--;
    state.pomodoro.seconds = 59;
  } else {
    state.pomodoro.seconds--;
  }

  updatePomodoroTimerDisplay();
}

function updatePomodoroTimerDisplay() {
  const mins = state.pomodoro.minutes;
  const secs = state.pomodoro.seconds;
  const displayStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Update timer label
  document.getElementById('pomodoro-timer-label').textContent = displayStr;
  document.getElementById('db-timer-value').textContent = displayStr;
  document.getElementById('mobile-pomodoro-time').textContent = displayStr;
  document.getElementById('header-pomodoro-time').textContent = displayStr;

  // Update Mode labels
  const stateLabel = document.getElementById('pomodoro-timer-state-label');
  const headerStateLabel = document.getElementById('header-pomodoro-label');
  
  let labelText = 'STUDY BLOCK';
  if (state.pomodoro.mode === 'break') labelText = 'SHORT BREAK';
  if (state.pomodoro.mode === 'longBreak') labelText = 'LONG REST';

  stateLabel.textContent = labelText;
  headerStateLabel.textContent = labelText;

  // SVG circular radial path dash offset animation
  const circle = document.getElementById('pomodoro-timer-circle');
  if (circle) {
    const maxOffset = 282.7; // 2 * PI * r (r=45)
    const currentSecondsRemaining = (mins * 60) + secs;
    const percentRemaining = currentSecondsRemaining / state.pomodoro.totalDurationSeconds;
    circle.style.strokeDashoffset = (maxOffset - (percentRemaining * maxOffset)).toString();
  }
}

function resetPomodoroTimer() {
  clearInterval(state.pomodoro.intervalId);
  state.pomodoro.isActive = false;
  
  // Default back to active mode setup duration
  const presetActive = document.querySelector('.timer-presets-row button.active');
  let mins = 25;
  if (presetActive) {
    const minutesAttr = presetActive.getAttribute('data-minutes');
    if (minutesAttr !== 'custom') mins = parseInt(minutesAttr, 10);
  }

  state.pomodoro.minutes = mins;
  state.pomodoro.seconds = 0;
  state.pomodoro.totalDurationSeconds = mins * 60;

  updatePomodoroTimerDisplay();

  const pomoBtn = document.getElementById('pomodoro-btn-toggle');
  const pomoDbToggle = document.getElementById('db-timer-toggle');

  if (pomoBtn) {
    pomoBtn.innerHTML = '<i data-lucide="play"></i> Start Focusing';
    pomoBtn.className = 'primary-btn pad-md font-display';
  }
  if (pomoDbToggle) {
    pomoDbToggle.innerHTML = '<i data-lucide="play"></i> Start';
  }

  document.getElementById('sidebar-timer-badge').classList.add('hidden');
  document.getElementById('mobile-pomodoro-badge').classList.add('hidden');
  document.getElementById('header-pomodoro-card').classList.add('hidden');
  
  triggerLucideIcons();
}

function handleFocusCycleCompletion() {
  clearInterval(state.pomodoro.intervalId);
  state.pomodoro.isActive = false;

  // Notify User
  playChime();
  
  if (state.pomodoro.mode === 'study') {
    state.pomodoro.completedToday++;
    state.pomodoro.totalMinutesToday += Math.round(state.pomodoro.totalDurationSeconds / 60);
    
    logStudyMinutes(Math.round(state.pomodoro.totalDurationSeconds / 60));
    
    showToast('Focus session complete! Amazing job! Take a well-deserved break.', 'success');
    
    // Auto preset short break duration
    setPomodoroDuration(5, 'break');
    const bBtn = document.getElementById('pomo-preset-5');
    if (bBtn) {
      document.querySelectorAll('.timer-presets-row button').forEach(b => b.classList.remove('active'));
      bBtn.classList.add('active');
    }
  } else {
    showToast('Break complete! Ready to start another focus block?', 'info');
    
    // Auto set back to study block
    setPomodoroDuration(25, 'study');
    const sBtn = document.getElementById('pomo-preset-25');
    if (sBtn) {
      document.querySelectorAll('.timer-presets-row button').forEach(b => b.classList.remove('active'));
      sBtn.classList.add('active');
    }
  }

  saveStateToStorage();
  renderPomodoroStatsUI();
  resetPomodoroTimer();
}

function renderPomodoroStatsUI() {
  document.getElementById('pomodoro-session-count').textContent = state.pomodoro.completedToday.toString();
  document.getElementById('pomodoro-total-minutes').textContent = `${state.pomodoro.totalMinutesToday} Minutes`;
  document.getElementById('db-timer-sessions').textContent = `Completed Sessions: ${state.pomodoro.completedToday}`;
}

function playChime() {
  try {
    // Generate simple sine wave chime using browser AudioContext
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Note A5
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // Note E6
    
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (err) {
    console.warn('Audio Context chime could not execute: ', err);
  }
}

/* ==========================================================================
   DAILY STREAK LOGIC
   ========================================================================== */

function checkAndUpdateStreakOnLaunch() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  const lastUpdate = state.streakLastUpdated;

  if (lastUpdate === today) {
    // Already updated today
    return;
  }

  if (lastUpdate === yesterday || lastUpdate === '') {
    // Streak continues or first ever launch, do not reset yet
    if (lastUpdate === yesterday) {
      // Streak continues upon study completion
    }
  } else {
    // Lost streak, reset to 0
    state.streak = 0;
    saveStateToStorage();
    renderDashboardProgress();
  }
}

function logStudyMinutes(mins) {
  const todayDateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  
  // Find today session block
  let todayLog = state.studySessions.find(s => s.date === todayDateStr);
  if (!todayLog) {
    // Append or replace
    if (state.studySessions.length >= 7) {
      state.studySessions.shift(); // keep it to 7 rolling days
    }
    todayLog = { date: todayDateStr, minutes: 0 };
    state.studySessions.push(todayLog);
  }

  todayLog.minutes += mins;

  // Increment Study Habit Streaks if not done today
  const today = new Date().toDateString();
  if (state.streakLastUpdated !== today) {
    state.streak++;
    state.streakLastUpdated = today;
  }

  saveStateToStorage();
  renderDashboardProgress();
  renderActivityChart();
}

/* ==========================================================================
   MARKDOWN PARSER & SANITIZER (PURE JS)
   ========================================================================== */

function renderMarkdown(md) {
  if (!md) return '';
  
  let html = md;

  // 1. Parse code blocks with syntax wrapper copy buttons
  let codeBlockCounter = 0;
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    codeBlockCounter++;
    const elementId = `code-snippet-${codeBlockCounter}`;
    const escapedCode = sanitizeHTML(code.trim());
    return `
      <div class="code-block-container margin-y-sm">
        <div class="code-block-header">
          <span>${lang || 'CODE'}</span>
          <button class="code-copy-btn" data-target="${elementId}">
            <i data-lucide="copy" style="width:12px;height:12px;"></i> Copy Code
          </button>
        </div>
        <pre><code id="${elementId}">${escapedCode}</code></pre>
      </div>
    `;
  });

  // 2. Parse inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 3. Parse headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="explain-section-title">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="explain-section-title">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="explain-section-title">$1</h1>');

  // 4. Parse bold markdown elements
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 5. Parse bullet point listings
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');
  // Wrap li sets in ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  // Clean double overlapping duplicate uls
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 6. Clean and form normal paragraphs
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<div') || p.trim().startsWith('<pre')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n\n');

  return html;
}

function sanitizeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   EXPORT & DOWNLOAD UTILITIES
   ========================================================================== */

function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      showToast('Copy action failed. Please highlight and copy manually.', 'error');
    });
  } else {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (err) {
      showToast('Copy failed.', 'error');
    }
    document.body.removeChild(textarea);
  }
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
