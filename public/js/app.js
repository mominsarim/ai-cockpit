/**
 * AI Cockpit - Master Client Controller
 * Live Wallpaper & Engineering Focus HUD
 */

(function () {
  'use strict';

  // Master State
  const state = {
    user: 'default',
    feeds: [],
    currentFeedCategory: 'All',
    featuredIndex: 0,
    feedCycleInterval: null,
    tasks: [],
    streak: 0,
    progress: { total: 0, completed: 0, percent: 0, quote: '' },
    isOnline: true,
    isSidebarCollapsed: localStorage.getItem('cockpit_hud_collapsed') === 'true',
    theme: localStorage.getItem('cockpit_theme') || 'cyan',
    opacity: parseFloat(localStorage.getItem('cockpit_opacity')) || 0.78,
    soundEnabled: localStorage.getItem('cockpit_sound') !== 'false'
  };

  // DOM Elements
  const elements = {
    clock: document.getElementById('hud-clock'),
    date: document.getElementById('hud-date'),
    sidebar: document.getElementById('cockpit-sidebar-hud'),
    collapseBtn: document.getElementById('collapse-sidebar-btn'),
    microPill: document.getElementById('zen-micro-pill'),
    pillStreak: document.getElementById('pill-streak'),
    pillTopTask: document.getElementById('pill-top-task'),
    soundBtn: document.getElementById('sound-btn'),
    soundIcon: document.getElementById('sound-icon'),
    tuningBtn: document.getElementById('tuning-btn'),
    tuningModal: document.getElementById('tuning-modal'),
    closeTuningBtn: document.getElementById('close-tuning-btn'),
    opacitySlider: document.getElementById('opacity-slider'),
    opacityVal: document.getElementById('opacity-val'),
    mobileLanUrl: document.getElementById('mobile-lan-url'),
    mobileLanHint: document.getElementById('mobile-lan-hint'),

    // Gist Elements
    gistStatusPill: document.getElementById('gist-status-pill'),
    gistTokenInput: document.getElementById('gist-token-input'),
    gistIdInput: document.getElementById('gist-id-input'),
    linkGistBtn: document.getElementById('link-gist-btn'),
    pullGistBtn: document.getElementById('pull-gist-btn'),
    gistActiveMeta: document.getElementById('gist-active-meta'),

    // Background mode buttons
    bgNeuralBtn: document.getElementById('bg-mode-neural'),
    bgObsidianBtn: document.getElementById('bg-mode-obsidian'),
    bgCustomBtn: document.getElementById('bg-mode-custom'),
    customBgInput: document.getElementById('custom-bg-input'),

    // Scratchpad
    scratchpadBtn: document.getElementById('open-scratchpad-btn'),
    scratchpadModal: document.getElementById('scratchpad-modal'),
    closeScratchpadBtn: document.getElementById('close-scratchpad-btn'),
    saveScratchpadBtn: document.getElementById('save-scratchpad-btn'),

    // Task Elements
    streakCounter: document.getElementById('streak-counter'),
    tasksCount: document.getElementById('tasks-count'),
    progressPct: document.getElementById('progress-pct'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    dopamineQuote: document.getElementById('dopamine-quote'),
    taskList: document.getElementById('sidebar-task-list'),
    newTaskForm: document.getElementById('new-task-form'),
    newTaskText: document.getElementById('new-task-text'),
    newTaskCategory: document.getElementById('new-task-category'),

    // Feed Elements
    feedMiniFilters: document.getElementById('feed-mini-filters'),
    spotlightCard: document.getElementById('spotlight-mini-card'),
    spotlightTag: document.getElementById('spotlight-mini-tag'),
    spotlightTitle: document.getElementById('spotlight-mini-title'),
    spotlightSource: document.getElementById('spotlight-mini-source'),
    spotlightLink: document.getElementById('spotlight-open-link'),
    addFeedTrigger: document.getElementById('add-feed-trigger'),
    addFeedModal: document.getElementById('add-feed-modal'),
    closeFeedModalBtn: document.getElementById('close-feed-modal-btn'),
    cancelFeedModalBtn: document.getElementById('cancel-feed-modal-btn'),
    createFeedForm: document.getElementById('create-feed-form'),

    // Sync
    syncDot: document.getElementById('sync-dot'),
    syncLabel: document.getElementById('sync-label')
  };

  /* ==========================================================================
     CLOCK & DATE
     ========================================================================== */
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    if (elements.clock) elements.clock.textContent = `${h}:${m}:${s}`;
    if (elements.date) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      elements.date.textContent = now.toLocaleDateString(undefined, options);
    }
  }

  /* ==========================================================================
     SIDEBAR COLLAPSE & ZEN PILL ENGINE
     ========================================================================== */
  function setSidebarCollapsed(collapsed) {
    state.isSidebarCollapsed = collapsed;
    localStorage.setItem('cockpit_hud_collapsed', collapsed);

    if (collapsed) {
      elements.sidebar.classList.add('collapsed');
      elements.microPill.classList.add('visible');
    } else {
      elements.sidebar.classList.remove('collapsed');
      elements.microPill.classList.remove('visible');
    }
  }

  function toggleSidebar() {
    if (window.soundEngine) window.soundEngine.playClick();
    setSidebarCollapsed(!state.isSidebarCollapsed);
  }

  function updateMicroPill() {
    if (elements.pillStreak) {
      elements.pillStreak.textContent = `🔥 ${state.streak}d`;
    }

    if (elements.pillTopTask) {
      const firstIncomplete = state.tasks.find(t => !t.completed);
      if (firstIncomplete) {
        elements.pillTopTask.textContent = `🎯 #1: ${firstIncomplete.text}`;
      } else if (state.tasks.length > 0) {
        elements.pillTopTask.textContent = `✅ All Missions Accomplished!`;
      } else {
        elements.pillTopTask.textContent = `🎯 Ready to sequence tasks`;
      }
    }
  }

  /* ==========================================================================
     SYNC & NETWORK STATUS
     ========================================================================== */
  function setSyncStatus(status, label) {
    if (!elements.syncDot || !elements.syncLabel) return;
    elements.syncDot.className = 'sync-dot ' + status;
    elements.syncLabel.textContent = label || status.toUpperCase();
    state.isOnline = status === 'online';
  }

  function saveLocal(key, val) {
    try { localStorage.setItem(`cockpit_${key}`, JSON.stringify(val)); } catch (e) {}
  }

  function getLocal(key) {
    try {
      const v = localStorage.getItem(`cockpit_${key}`);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }

  /* ==========================================================================
     DOPAMINE TASKS & SEQUENCE ENGINE
     ========================================================================== */
  async function loadTasks() {
    try {
      const res = await fetch(`/api/tasks?user=${encodeURIComponent(state.user)}`);
      if (!res.ok) throw new Error('Tasks fetch failed');
      const data = await res.json();

      state.tasks = data.tasks || [];
      state.streak = data.streak || 0;
      state.progress = data.progress || { total: 0, completed: 0, percent: 0, quote: '' };

      saveLocal('tasks', state.tasks);
      saveLocal('streak', state.streak);
      setSyncStatus('online', 'ONLINE');
    } catch (err) {
      state.tasks = getLocal('tasks') || [];
      state.streak = getLocal('streak') || 0;
      computeLocalProgress();
      setSyncStatus('offline', 'OFFLINE');
    }

    renderTasks();
    renderProgressUI();
    updateMicroPill();
  }

  function computeLocalProgress() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    state.progress = {
      total,
      completed,
      percent,
      quote: percent === 100 ? "Mission Accomplished! Streak Secured." : "Momentum initiated. Keep the flow state alive!",
      isAllCompleted: total > 0 && completed === total
    };
  }

  function renderProgressUI() {
    const { total, completed, percent, quote } = state.progress;

    if (elements.streakCounter) elements.streakCounter.textContent = state.streak;
    if (elements.tasksCount) elements.tasksCount.textContent = `${completed}/${total} Done`;
    if (elements.progressPct) elements.progressPct.textContent = `${percent}%`;
    if (elements.progressBarFill) elements.progressBarFill.style.width = `${percent}%`;
    if (elements.dopamineQuote && quote) elements.dopamineQuote.textContent = `“${quote}”`;
  }

  function renderTasks() {
    elements.taskList.innerHTML = '';
    if (state.tasks.length === 0) {
      elements.taskList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.75rem; padding:16px;">No focus missions sequenced today.</div>`;
      return;
    }

    state.tasks.forEach((task, idx) => {
      const taskEl = document.createElement('div');
      taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;
      taskEl.dataset.taskId = task.id;

      const seqNum = idx + 1;
      const isTopThree = seqNum <= 3;

      taskEl.innerHTML = `
        <div class="task-left">
          <span class="seq-badge" style="${isTopThree ? 'border-color:var(--accent-color);' : 'opacity:0.6;'}">#${seqNum}</span>
          <div class="custom-checkbox">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div class="task-content">
            <span class="task-text">${escapeHTML(task.text)}</span>
            <span class="task-category-tag">// ${escapeHTML(task.category)}</span>
          </div>
        </div>
        <button class="task-delete-btn" title="Delete" data-action="delete">✕</button>
      `;

      taskEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete"]')) return;
        handleTaskToggle(task);
      });

      const deleteBtn = taskEl.querySelector('[data-action="delete"]');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTaskDelete(task.id);
      });

      elements.taskList.appendChild(taskEl);
    });
  }

  async function handleTaskToggle(task) {
    const willBeCompleted = !task.completed;
    task.completed = willBeCompleted;

    computeLocalProgress();
    renderTasks();
    renderProgressUI();
    updateMicroPill();

    if (willBeCompleted) {
      if (state.progress.percent === 100) {
        if (window.soundEngine) window.soundEngine.playVictory();
        if (window.confettiEngine) window.confettiEngine.fire(0.5, 0.4, 100);
      } else {
        if (window.soundEngine) window.soundEngine.playComplete();
        if (window.confettiEngine) window.confettiEngine.fire(0.85, 0.4, 25);
      }
    } else {
      if (window.soundEngine) window.soundEngine.playClick();
    }

    try {
      setSyncStatus('syncing', 'SYNC');
      const res = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, completed: willBeCompleted, user: state.user })
      });
      if (res.ok) {
        const data = await res.json();
        state.streak = data.streak;
        state.progress = data.progress;
        saveLocal('tasks', state.tasks);
        saveLocal('streak', state.streak);
        renderProgressUI();
        updateMicroPill();
        setSyncStatus('online', 'ONLINE');
      }
    } catch (e) {
      setSyncStatus('offline', 'OFFLINE');
    }
  }

  async function handleTaskCreate(text, category) {
    if (!text.trim()) return;
    if (window.soundEngine) window.soundEngine.playClick();

    const tempTask = {
      id: `task-${Date.now()}`,
      text: text.trim(),
      category: category || 'Deep Work',
      completed: false,
      recurring: true
    };

    state.tasks.push(tempTask);
    computeLocalProgress();
    renderTasks();
    renderProgressUI();
    updateMicroPill();
    elements.newTaskText.value = '';

    try {
      setSyncStatus('syncing', 'SYNC');
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tempTask.text, category: tempTask.category, recurring: true, user: state.user })
      });
      if (res.ok) {
        const data = await res.json();
        tempTask.id = data.task.id;
        saveLocal('tasks', state.tasks);
        setSyncStatus('online', 'ONLINE');
      }
    } catch (e) {
      setSyncStatus('offline', 'OFFLINE');
    }
  }

  async function handleTaskDelete(taskId) {
    if (window.soundEngine) window.soundEngine.playClick();
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    computeLocalProgress();
    renderTasks();
    renderProgressUI();
    updateMicroPill();

    try {
      await fetch('/api/tasks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, user: state.user })
      });
      saveLocal('tasks', state.tasks);
    } catch (e) {}
  }

  /* ==========================================================================
     INNOVATION FEED MODULE
     ========================================================================== */
  async function loadFeeds() {
    try {
      const url = state.currentFeedCategory === 'All'
        ? '/api/feeds'
        : `/api/feeds?category=${encodeURIComponent(state.currentFeedCategory)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Feeds fetch failed');
      const data = await res.json();
      state.feeds = data.feeds || [];
      saveLocal('feeds', state.feeds);
    } catch (e) {
      state.feeds = getLocal('feeds') || [];
    }
    renderSpotlight();
  }

  function renderSpotlight() {
    if (state.feeds.length === 0) {
      elements.spotlightTitle.textContent = "No headlines loaded in this category.";
      elements.spotlightSource.textContent = "AI Cockpit";
      elements.spotlightTag.textContent = `#FEED`;
      return;
    }

    if (state.featuredIndex >= state.feeds.length) state.featuredIndex = 0;
    const current = state.feeds[state.featuredIndex];

    elements.spotlightTag.textContent = `#${current.category.toUpperCase()} • SPOTLIGHT`;
    elements.spotlightTitle.textContent = current.title;
    elements.spotlightSource.textContent = `${current.source} • ${current.timestamp}`;

    elements.spotlightCard.onclick = () => {
      if (window.soundEngine) window.soundEngine.playClick();
      if (current.url && current.url !== '#') {
        window.open(current.url, '_blank', 'noopener,noreferrer');
      }
    };
  }

  function startSpotlightCycle() {
    clearInterval(state.feedCycleInterval);
    state.feedCycleInterval = setInterval(() => {
      if (state.feeds.length > 1) {
        state.featuredIndex = (state.featuredIndex + 1) % state.feeds.length;
        renderSpotlight();
      }
    }, 12000);
  }

  /* ==========================================================================
     WALLPAPER SETTINGS & THEMES
     ========================================================================== */
  function applyTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('cockpit_theme', themeName);

    document.querySelectorAll('.theme-swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.setTheme === themeName);
    });
  }

  function applyOpacity(val) {
    state.opacity = val;
    document.documentElement.style.setProperty('--hud-opacity', val);
    localStorage.setItem('cockpit_opacity', val);
    if (elements.opacityVal) elements.opacityVal.textContent = `${Math.round(val * 100)}%`;
  }

  async function checkLAN() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (elements.mobileLanUrl && data.mobileWidgetUrl) {
          elements.mobileLanUrl.innerHTML = `<a href="${data.mobileWidgetUrl}" target="_blank" style="color:var(--accent-color);">${data.mobileWidgetUrl}</a>`;
        }
        if (elements.mobileLanHint && data.localIps && data.localIps[0]) {
          elements.mobileLanHint.textContent = `LAN: ${data.localIps[0].ip}:3000`;
        }
      }
    } catch (e) {}
  }

  async function checkGistStatus() {
    try {
      const res = await fetch('/api/gist/status');
      if (res.ok) {
        const data = await res.json();
        if (data.enabled) {
          if (elements.gistStatusPill) {
            elements.gistStatusPill.textContent = '☁️ Connected';
            elements.gistStatusPill.style.color = 'var(--success-color)';
          }
          if (elements.gistIdInput && data.gistId) {
            elements.gistIdInput.value = data.gistId;
          }
          if (elements.gistActiveMeta) {
            elements.gistActiveMeta.style.display = 'block';
            elements.gistActiveMeta.innerHTML = `Active Gist: <a href="${data.gistUrl}" target="_blank" style="color:var(--accent-color);">${data.gistId}</a> ${data.lastSync ? '(' + new Date(data.lastSync).toLocaleTimeString() + ')' : ''}`;
          }
        } else {
          if (elements.gistStatusPill) {
            elements.gistStatusPill.textContent = 'Offline / Local';
            elements.gistStatusPill.style.color = 'var(--text-muted)';
          }
        }
      }
    } catch (e) {}
  }

  /* ==========================================================================
     SETUP LISTENERS
     ========================================================================== */
  function setupListeners() {
    // Clock
    setInterval(updateClock, 1000);
    updateClock();

    // Toggle Sidebar HUD
    elements.collapseBtn.addEventListener('click', toggleSidebar);
    elements.microPill.addEventListener('click', toggleSidebar);

    // Keyboard shortcut: Press 'Z' for Zen Mode toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'z' || e.key === 'Z') {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        toggleSidebar();
      }
    });

    // Sound Toggle
    elements.soundBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      if (window.soundEngine) window.soundEngine.enabled = state.soundEnabled;
      elements.soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
      localStorage.setItem('cockpit_sound', state.soundEnabled);
      if (state.soundEnabled && window.soundEngine) window.soundEngine.playClick();
    });

    // Tuning Modal
    elements.tuningBtn.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      elements.tuningModal.classList.add('open');
      checkLAN();
      checkGistStatus();
    });

    elements.closeTuningBtn.addEventListener('click', () => {
      elements.tuningModal.classList.remove('open');
    });

    // GitHub Gist Link & Sync Button
    if (elements.linkGistBtn) {
      elements.linkGistBtn.addEventListener('click', async () => {
        const token = elements.gistTokenInput ? elements.gistTokenInput.value.trim() : '';
        const gistId = elements.gistIdInput ? elements.gistIdInput.value.trim() : '';

        if (!token) {
          alert('Please enter your GitHub Personal Access Token (PAT).');
          return;
        }

        elements.linkGistBtn.textContent = 'Linking...';
        try {
          const res = await fetch('/api/gist/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, gistId })
          });
          const data = await res.json();

          if (data.success) {
            if (window.soundEngine) window.soundEngine.playVictory();
            alert(`🎉 Success! Linked with GitHub Gist ID: ${data.gistId}`);
            checkGistStatus();
            loadTasks();
            loadFeeds();
          } else {
            alert('Error linking Gist: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          alert('Network error connecting to Gist: ' + err.message);
        } finally {
          elements.linkGistBtn.textContent = 'Link & Sync Gist';
        }
      });
    }

    if (elements.pullGistBtn) {
      elements.pullGistBtn.addEventListener('click', async () => {
        elements.pullGistBtn.textContent = 'Pulling...';
        try {
          const res = await fetch('/api/gist/sync', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            if (window.soundEngine) window.soundEngine.playComplete();
            loadTasks();
            loadFeeds();
            checkGistStatus();
          } else {
            alert('Pull failed: ' + (data.error || data.reason || 'Check Gist setup'));
          }
        } catch (e) {
          alert('Pull error: ' + e.message);
        } finally {
          elements.pullGistBtn.textContent = '↻ Pull';
        }
      });
    }

    // Scratchpad Modal
    elements.scratchpadBtn.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      elements.scratchpadModal.classList.add('open');
    });

    elements.closeScratchpadBtn.addEventListener('click', () => {
      elements.scratchpadModal.classList.remove('open');
    });

    elements.saveScratchpadBtn.addEventListener('click', () => {
      elements.scratchpadModal.classList.remove('open');
      if (window.soundEngine) window.soundEngine.playComplete();
    });

    // Feed Mini Filters
    elements.feedMiniFilters.addEventListener('click', (e) => {
      const pill = e.target.closest('.feed-mini-pill');
      if (!pill) return;
      document.querySelectorAll('.feed-mini-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentFeedCategory = pill.dataset.category;
      state.featuredIndex = 0;
      if (window.soundEngine) window.soundEngine.playClick();
      loadFeeds();
    });

    // Add Feed Headline Trigger
    elements.addFeedTrigger.addEventListener('click', () => {
      elements.addFeedModal.classList.add('open');
      if (window.soundEngine) window.soundEngine.playClick();
    });

    elements.closeFeedModalBtn.addEventListener('click', () => {
      elements.addFeedModal.classList.remove('open');
    });
    elements.cancelFeedModalBtn.addEventListener('click', () => {
      elements.addFeedModal.classList.remove('open');
    });

    elements.createFeedForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('feed-input-title').value;
      const summary = document.getElementById('feed-input-summary').value;
      const category = document.getElementById('feed-input-category').value;
      const source = document.getElementById('feed-input-source').value || 'Personal Note';
      const url = document.getElementById('feed-input-url').value || '#';

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, summary, category, source, url, featured: true })
        });
        if (res.ok) {
          if (window.soundEngine) window.soundEngine.playComplete();
          elements.addFeedModal.classList.remove('open');
          elements.createFeedForm.reset();
          loadFeeds();
        }
      } catch (err) {}
    });

    // Add Task Form
    elements.newTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleTaskCreate(elements.newTaskText.value, elements.newTaskCategory.value);
    });

    // Background Mode Buttons
    elements.bgNeuralBtn.addEventListener('click', () => {
      if (window.neuralWallpaper) window.neuralWallpaper.setMode('neural');
      elements.customBgInput.style.display = 'none';
      if (window.soundEngine) window.soundEngine.playClick();
    });

    elements.bgObsidianBtn.addEventListener('click', () => {
      if (window.neuralWallpaper) window.neuralWallpaper.setMode('obsidian');
      elements.customBgInput.style.display = 'none';
      if (window.soundEngine) window.soundEngine.playClick();
    });

    elements.bgCustomBtn.addEventListener('click', () => {
      elements.customBgInput.style.display = 'block';
      elements.customBgInput.focus();
    });

    elements.customBgInput.addEventListener('change', (e) => {
      const url = e.target.value.trim();
      if (url && window.neuralWallpaper) {
        window.neuralWallpaper.setMode('custom', url);
        if (window.soundEngine) window.soundEngine.playClick();
      }
    });

    // Theme Swatches
    document.querySelectorAll('.theme-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        applyTheme(sw.dataset.setTheme);
        if (window.soundEngine) window.soundEngine.playClick();
      });
    });

    // Opacity Slider
    elements.opacitySlider.addEventListener('input', (e) => {
      applyOpacity(parseFloat(e.target.value));
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  /* ==========================================================================
     INIT
     ========================================================================== */
  function init() {
    applyTheme(state.theme);
    applyOpacity(state.opacity);
    if (elements.opacitySlider) elements.opacitySlider.value = state.opacity;

    if (elements.soundIcon) elements.soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    if (window.soundEngine) window.soundEngine.enabled = state.soundEnabled;

    setSidebarCollapsed(state.isSidebarCollapsed);

    setupListeners();
    loadTasks();
    loadFeeds().then(() => startSpotlightCycle());
    checkLAN();
    // Auto-refresh tasks every 10 seconds so changes from mobile appear automatically
    setInterval(loadTasks, 10000);
    setInterval(loadFeeds, 300000);

    // Instant refresh when returning to window or unlocking laptop
    window.addEventListener('focus', () => loadTasks());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadTasks();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
