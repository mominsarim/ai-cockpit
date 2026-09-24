/**
 * WallpaperCanvas - Generative Neural Network / Synapse Lattice
 * Designed specifically for AI Engineers & deep concentration.
 * Optimized for low CPU/battery consumption on laptops.
 */

class NeuralWallpaper {
  constructor(canvasId = 'wallpaper-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.particleCount = 65; // balanced for aesthetic and near-zero CPU
    this.maxDistance = 140;
    this.mouse = { x: null, y: null, radius: 160 };
    this.animId = null;
    this.mode = localStorage.getItem('cockpit_bg_mode') || 'neural'; // 'neural', 'obsidian', 'custom'
    this.customBgUrl = localStorage.getItem('cockpit_custom_bg') || '';
    this.lastFrameTime = 0;
    this.targetFps = 35; // gentle, battery-friendly frame rate
    this.frameInterval = 1000 / this.targetFps;

    if (this.canvas) {
      this.init();
    }
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }, { passive: true });

    window.addEventListener('mouseout', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    }, { passive: true });

    this.createParticles();
    this.applyBackgroundMode();
    this.animate(0);
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.4 + 0.3
      });
    }
  }

  setMode(mode, customUrl = '') {
    this.mode = mode;
    localStorage.setItem('cockpit_bg_mode', mode);
    if (customUrl) {
      this.customBgUrl = customUrl;
      localStorage.setItem('cockpit_custom_bg', customUrl);
    }
    this.applyBackgroundMode();
  }

  applyBackgroundMode() {
    const bgContainer = document.body;
    if (this.mode === 'custom' && this.customBgUrl) {
      bgContainer.style.backgroundImage = `linear-gradient(rgba(6,9,14,0.65), rgba(6,9,14,0.75)), url('${this.customBgUrl}')`;
      bgContainer.style.backgroundSize = 'cover';
      bgContainer.style.backgroundPosition = 'center';
      if (this.canvas) this.canvas.style.opacity = '0.35';
    } else if (this.mode === 'obsidian') {
      bgContainer.style.backgroundImage = 'none';
      bgContainer.style.backgroundColor = '#05070a';
      if (this.canvas) this.canvas.style.opacity = '0.05';
    } else {
      // Neural generative default
      bgContainer.style.backgroundImage = '';
      bgContainer.style.backgroundColor = '#06090e';
      if (this.canvas) this.canvas.style.opacity = '1';
    }
  }

  animate(currentTime) {
    this.animId = requestAnimationFrame((t) => this.animate(t));

    // Throttle frame rate for zero laptop fan spin
    const delta = currentTime - this.lastFrameTime;
    if (delta < this.frameInterval) return;
    this.lastFrameTime = currentTime - (delta % this.frameInterval);

    if (this.mode === 'obsidian' && this.particles.length === 0) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Accent color from root styles
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '0, 240, 255';

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Update and draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Bounce gracefully at borders
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      // Mouse gentle repulsion
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }
      }

      // Draw particle dot
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${accentRgb}, ${p.baseAlpha})`;
      this.ctx.fill();

      // Connect nearby particles with subtle neural lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.maxDistance) {
          const alpha = (1 - dist / this.maxDistance) * 0.18;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(${accentRgb}, ${alpha})`;
          this.ctx.lineWidth = 0.85;
          this.ctx.stroke();
        }
      }
    }
  }
}

window.neuralWallpaper = new NeuralWallpaper();
