/**
 * GitHub Gist Sync Engine for AI Cockpit
 * Serverless, zero-cost cloud synchronization between Laptop Wallpaper and Mobile Widgets.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'gist-config.json');
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
const FEEDS_FILE = path.join(__dirname, 'data', 'feeds.json');

class GistSync {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
    } catch (e) {
      console.warn('Could not read gist-config.json:', e);
    }
    return { enabled: false, gistId: '', token: '', lastSync: null };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      const dataDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('Failed to save gist-config.json:', e);
      return false;
    }
  }

  getStatus() {
    return {
      enabled: Boolean(this.config.enabled && this.config.gistId && this.config.token),
      gistId: this.config.gistId || '',
      hasToken: Boolean(this.config.token),
      lastSync: this.config.lastSync || null,
      gistUrl: this.config.gistId ? `https://gist.github.com/${this.config.gistId}` : null
    };
  }

  // Create a new secret Gist on GitHub with current local tasks and feeds
  async createGist(token) {
    if (!token) throw new Error('GitHub Personal Access Token is required');

    let tasksContent = '{}';
    let feedsContent = '{}';

    try {
      if (fs.existsSync(TASKS_FILE)) tasksContent = fs.readFileSync(TASKS_FILE, 'utf8');
      if (fs.existsSync(FEEDS_FILE)) feedsContent = fs.readFileSync(FEEDS_FILE, 'utf8');
    } catch (e) {}

    const payload = {
      description: 'AI Cockpit - Cloud Sync Database (Tasks, Feeds & Streaks)',
      public: false, // Secret Gist
      files: {
        'tasks.json': { content: tasksContent },
        'feeds.json': { content: feedsContent },
        'cockpit-readme.md': {
          content: '# AI Cockpit Cloud Sync Database\n\nThis secret Gist automatically synchronizes your AI Cockpit productivity data, streaks, and feeds across your laptop wallpaper and mobile widgets.'
        }
      }
    };

    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'AI-Cockpit-HUD',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${res.statusText}`);
    }

    const data = await res.json();
    this.saveConfig({
      enabled: true,
      token,
      gistId: data.id,
      lastSync: new Date().toISOString()
    });

    return {
      success: true,
      gistId: data.id,
      url: data.html_url
    };
  }

  // Link an existing Gist ID
  async linkExistingGist(token, gistId) {
    if (!token || !gistId) throw new Error('Token and Gist ID are required');

    // Test access
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'AI-Cockpit-HUD'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to access Gist ${gistId}. Please verify permissions.`);
    }

    this.saveConfig({
      enabled: true,
      token,
      gistId,
      lastSync: new Date().toISOString()
    });

    // Pull immediate state from Gist
    await this.pullFromGist();

    return { success: true, gistId };
  }

  // Pull tasks.json and feeds.json from GitHub Gist into local server files
  async pullFromGist() {
    if (!this.config.enabled || !this.config.gistId || !this.config.token) {
      return { success: false, reason: 'Gist sync not configured' };
    }

    try {
      const res = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'AI-Cockpit-HUD'
        }
      });

      if (!res.ok) throw new Error(`Gist pull HTTP ${res.status}`);
      const data = await res.json();

      if (data.files && data.files['tasks.json'] && data.files['tasks.json'].content) {
        fs.writeFileSync(TASKS_FILE, data.files['tasks.json'].content, 'utf8');
      }

      if (data.files && data.files['feeds.json'] && data.files['feeds.json'].content) {
        fs.writeFileSync(FEEDS_FILE, data.files['feeds.json'].content, 'utf8');
      }

      this.saveConfig({ lastSync: new Date().toISOString() });
      return { success: true, timestamp: this.config.lastSync };
    } catch (e) {
      console.warn('Gist pull failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  // Push local tasks.json and feeds.json to GitHub Gist
  async pushToGist() {
    if (!this.config.enabled || !this.config.gistId || !this.config.token) {
      return { success: false, reason: 'Gist sync not configured' };
    }

    try {
      let tasksContent = '{}';
      let feedsContent = '{}';

      if (fs.existsSync(TASKS_FILE)) tasksContent = fs.readFileSync(TASKS_FILE, 'utf8');
      if (fs.existsSync(FEEDS_FILE)) feedsContent = fs.readFileSync(FEEDS_FILE, 'utf8');

      const payload = {
        files: {
          'tasks.json': { content: tasksContent },
          'feeds.json': { content: feedsContent }
        }
      };

      const res = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'AI-Cockpit-HUD',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Gist push HTTP ${res.status}`);

      this.saveConfig({ lastSync: new Date().toISOString() });
      return { success: true, timestamp: this.config.lastSync };
    } catch (e) {
      console.warn('Gist push failed:', e.message);
      return { success: false, error: e.message };
    }
  }
}

module.exports = new GistSync();
