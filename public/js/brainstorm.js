/**
 * Brainstorm & Engineering Focus Engine
 * First-principles mental models, deep work flow timer, and scratchpad
 * Built for introverted AI engineers and freelance builders.
 */

class BrainstormEngine {
  constructor() {
    this.prompts = [
      {
        principle: "FIRST PRINCIPLES",
        question: "Deconstruct to fundamentals: If you had to rebuild this from raw mathematics and code, what is strictly necessary?",
        author: "Elon Musk's Engineering Algorithm"
      },
      {
        principle: "DELETE THE PROCESS STEP",
        question: "What is the single most unnecessary abstraction or component in your architecture? Delete it without hesitation.",
        author: "Occam's Razor"
      },
      {
        principle: "THE BOTTLENECK THEORY",
        question: "Where is the single rate-limiting step holding back today's progress? Focus 100% of your energy solely on that node.",
        author: "Goldratt's Theory of Constraints"
      },
      {
        principle: "QUIET MASTERY & RESULTS",
        question: "Work quietly in monk mode. No premature announcements. Let the shipped, working release speak for itself.",
        author: "Introvert Craftsmanship"
      },
      {
        principle: "THINNEST VALUABLE SLICE",
        question: "Can you build the thinnest end-to-end slice that works today? Prove the loop before writing another line.",
        author: "Agile Engineering"
      },
      {
        principle: "INVERSION",
        question: "Invert: What is the most likely way this freelance project or architecture could fail? Build safeguards for that first.",
        author: "Charlie Munger"
      },
      {
        principle: "PARETO 80/20",
        question: "Which single feature or prompt pipeline delivers 80% of the perceived magic to the user? Polish only that.",
        author: "Vilfredo Pareto"
      },
      {
        principle: "FREELANCE LEVERAGE",
        question: "Are you selling hours or building a reusable, scalable AI asset with compounding equity?",
        author: "Naval Ravikant"
      },
      {
        principle: "MINIMUM COGNITIVE LOAD",
        question: "Step away from the screen for 60 seconds. What is the single outcome that must be true when you shut your laptop tonight?",
        author: "Deep Work Protocol"
      },
      {
        principle: "LATENCY & ITERATION SPEED",
        question: "How can you reduce the feedback loop from code change to observation down to less than 2 seconds?",
        author: "AI Model Development"
      }
    ];

    this.currentIndex = parseInt(localStorage.getItem('cockpit_prompt_idx')) || 0;
    this.promptEl = document.getElementById('zen-prompt-text');
    this.principleEl = document.getElementById('zen-principle-badge');
    this.authorEl = document.getElementById('zen-author-text');

    // Flow Timer State
    this.timerInterval = null;
    this.timerSeconds = 25 * 60;
    this.totalSeconds = 25 * 60;
    this.isRunning = false;

    this.timerDisplay = document.getElementById('flow-timer-display');
    this.timerToggleBtn = document.getElementById('flow-timer-toggle');
    this.timerModeSelect = document.getElementById('flow-timer-mode');

    this.init();
  }

  init() {
    this.renderCurrentPrompt();

    const shuffleBtn = document.getElementById('zen-shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => this.nextPrompt());
    }

    if (this.timerToggleBtn) {
      this.timerToggleBtn.addEventListener('click', () => this.toggleTimer());
    }

    if (this.timerModeSelect) {
      this.timerModeSelect.addEventListener('change', (e) => {
        const mins = parseInt(e.target.value) || 25;
        this.resetTimer(mins);
      });
    }

    // Scratchpad
    const scratchpad = document.getElementById('brainstorm-scratchpad');
    if (scratchpad) {
      scratchpad.value = localStorage.getItem('cockpit_scratchpad') || '';
      scratchpad.addEventListener('input', (e) => {
        localStorage.setItem('cockpit_scratchpad', e.target.value);
      });
    }
  }

  renderCurrentPrompt() {
    if (!this.prompts[this.currentIndex]) this.currentIndex = 0;
    const p = this.prompts[this.currentIndex];

    if (this.promptEl) this.promptEl.textContent = `“${p.question}”`;
    if (this.principleEl) this.principleEl.textContent = p.principle;
    if (this.authorEl) this.authorEl.textContent = `// ${p.author}`;
    localStorage.setItem('cockpit_prompt_idx', this.currentIndex);
  }

  nextPrompt() {
    if (window.soundEngine) window.soundEngine.playClick();
    this.currentIndex = (this.currentIndex + 1) % this.prompts.length;
    
    // Quick micro animation
    if (this.promptEl) {
      this.promptEl.style.opacity = '0';
      setTimeout(() => {
        this.renderCurrentPrompt();
        this.promptEl.style.opacity = '1';
      }, 150);
    } else {
      this.renderCurrentPrompt();
    }
  }

  // Flow Timer Methods
  toggleTimer() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    if (this.timerToggleBtn) this.timerToggleBtn.textContent = '⏸ Pause';
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();

      if (this.timerSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        if (this.timerToggleBtn) this.timerToggleBtn.textContent = '▶ Flow';
        if (window.soundEngine) window.soundEngine.playVictory();
        if (window.confettiEngine) window.confettiEngine.fire(0.5, 0.4, 60);
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    if (this.timerToggleBtn) this.timerToggleBtn.textContent = '▶ Resume';
  }

  resetTimer(minutes) {
    this.pauseTimer();
    this.totalSeconds = minutes * 60;
    this.timerSeconds = this.totalSeconds;
    if (this.timerToggleBtn) this.timerToggleBtn.textContent = '▶ Flow';
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    if (!this.timerDisplay) return;
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    this.timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

window.brainstormEngine = new BrainstormEngine();
