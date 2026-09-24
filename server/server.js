const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const gistSync = require('./gist-sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Paths to JSON data stores
const FEEDS_FILE = path.join(__dirname, 'data', 'feeds.json');
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');

// Ensure data files exist
function ensureDataFiles() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(FEEDS_FILE)) {
    fs.writeFileSync(FEEDS_FILE, JSON.stringify({ lastUpdated: new Date().toISOString(), feeds: [] }, null, 2));
  }
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify({ users: { default: { streak: 0, lastCompletedDate: null, lastActiveDate: getTodayDateString(), totalTasksFinished: 0, tasks: [] } } }, null, 2));
  }
}
ensureDataFiles();

// Helper: Get Today's Date String YYYY-MM-DD
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// Helper: Get Yesterday's Date String YYYY-MM-DD
function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Safe Read / Write JSON
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Motivational dopamine quotes triggered by milestone percentages
const MOTIVATIONAL_QUOTES = {
  zero: [
    "Your cockpit is active. Ignition starts with the first step.",
    "A journey of a thousand miles begins with a single commit.",
    "Small daily disciplines compound into monumental breakthroughs."
  ],
  early: [
    "Momentum initiated. Keep the flow state alive!",
    "Velocity is building. One more task, one more win.",
    "Dopamine firing. You are in command."
  ],
  halfway: [
    "Over the hump! Peak productivity unlocked.",
    "Halfway to total daily dominance. Stay locked in.",
    "Consistent execution separates dreams from engineering reality."
  ],
  almost: [
    "Final stretch! You are unstoppable today.",
    "Apex focus detected. Close the cockpit with a clean sweep.",
    "One final push to claim today's streak!"
  ],
  complete: [
    "MISSION ACCOMPLISHED! All targets liquidated today. 🔥",
    "Absolute legend. Streak secured and dopamine fully charged! 🚀",
    "Mastery in motion. Rest well, builder—tomorrow we conquer more."
  ]
};

function getDopamineQuote(percent) {
  let pool;
  if (percent === 100) pool = MOTIVATIONAL_QUOTES.complete;
  else if (percent >= 75) pool = MOTIVATIONAL_QUOTES.almost;
  else if (percent >= 50) pool = MOTIVATIONAL_QUOTES.halfway;
  else if (percent > 0) pool = MOTIVATIONAL_QUOTES.early;
  else pool = MOTIVATIONAL_QUOTES.zero;

  return pool[Math.floor(Math.random() * pool.length)];
}

// Check & perform midnight auto-reset for a user
function checkAndPerformAutoReset(userData) {
  const today = getTodayDateString();
  const lastActive = userData.lastActiveDate || today;

  if (lastActive !== today) {
    const yesterday = getYesterdayDateString();

    // Check if yesterday had all tasks finished
    const hadFinishedYesterday = userData.lastCompletedDate === yesterday;
    if (!hadFinishedYesterday && userData.lastCompletedDate !== today) {
      // Missed yesterday's completion; reset streak if more than 1 day skipped
      const diffDays = Math.round((new Date(today) - new Date(userData.lastCompletedDate || '2000-01-01')) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        userData.streak = 0;
      }
    }

    // Auto-reset recurring tasks
    userData.tasks = userData.tasks.map(task => {
      if (task.recurring) {
        return { ...task, completed: false, completedAt: null };
      }
      return task;
    });

    userData.lastActiveDate = today;
  }
  return userData;
}

// --- API ROUTES ---

// GET /api/feeds - Retrieve innovation feeds with optional category filter
app.get('/api/feeds', (req, res) => {
  const data = readJSON(FEEDS_FILE) || { feeds: [] };
  const { category, search } = req.query;

  let feeds = data.feeds || [];
  if (category && category.toLowerCase() !== 'all') {
    feeds = feeds.filter(f => f.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const query = search.toLowerCase();
    feeds = feeds.filter(f =>
      f.title.toLowerCase().includes(query) ||
      f.summary.toLowerCase().includes(query) ||
      (f.category && f.category.toLowerCase().includes(query))
    );
  }

  res.json({
    success: true,
    lastUpdated: data.lastUpdated,
    total: feeds.length,
    feeds
  });
});

// POST /api/feeds - Add or update a feed item
app.post('/api/feeds', (req, res) => {
  const { title, summary, category, source, url, featured } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'Title and category are required' });
  }

  const data = readJSON(FEEDS_FILE) || { feeds: [] };
  const newFeed = {
    id: `feed-${Date.now()}`,
    category,
    title,
    summary: summary || '',
    source: source || 'Curated Feed',
    url: url || '#',
    timestamp: 'Just now',
    featured: Boolean(featured)
  };

  data.feeds.unshift(newFeed);
  data.lastUpdated = new Date().toISOString();
  writeJSON(FEEDS_FILE, data);
  gistSync.pushToGist().catch(() => {});

  res.status(201).json({ success: true, feed: newFeed });
});

// GET /api/tasks - Retrieve user checklist & streak
app.get('/api/tasks', (req, res) => {
  const username = req.query.user || 'default';
  const data = readJSON(TASKS_FILE) || { users: {} };

  if (!data.users[username]) {
    data.users[username] = {
      streak: 0,
      lastCompletedDate: null,
      lastActiveDate: getTodayDateString(),
      totalTasksFinished: 0,
      tasks: []
    };
  }

  const user = checkAndPerformAutoReset(data.users[username]);
  writeJSON(TASKS_FILE, data);

  const total = user.tasks.length;
  const completed = user.tasks.filter(t => t.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    success: true,
    user: username,
    streak: user.streak,
    lastCompletedDate: user.lastCompletedDate,
    totalTasksFinished: user.totalTasksFinished || 0,
    progress: {
      total,
      completed,
      percent,
      quote: getDopamineQuote(percent),
      isAllCompleted: total > 0 && completed === total
    },
    tasks: user.tasks
  });
});

// POST /api/tasks/toggle - Toggle a task's completion state
app.post('/api/tasks/toggle', (req, res) => {
  const { taskId, completed, user: reqUser } = req.body;
  const username = reqUser || 'default';

  if (!taskId) {
    return res.status(400).json({ success: false, error: 'taskId is required' });
  }

  const data = readJSON(TASKS_FILE) || { users: {} };
  let user = data.users[username];
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  user = checkAndPerformAutoReset(user);

  const targetTask = user.tasks.find(t => t.id === taskId);
  if (!targetTask) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const isNowCompleted = completed !== undefined ? Boolean(completed) : !targetTask.completed;
  targetTask.completed = isNowCompleted;
  targetTask.completedAt = isNowCompleted ? new Date().toISOString() : null;

  if (isNowCompleted) {
    user.totalTasksFinished = (user.totalTasksFinished || 0) + 1;
  }

  // Calculate new progress
  const total = user.tasks.length;
  const completedCount = user.tasks.filter(t => t.completed).length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const today = getTodayDateString();

  // Streak logic: If all tasks are completed today for the first time
  let streakGained = false;
  if (total > 0 && completedCount === total) {
    if (user.lastCompletedDate !== today) {
      user.streak = (user.streak || 0) + 1;
      user.lastCompletedDate = today;
      streakGained = true;
    }
  }

  data.users[username] = user;
  writeJSON(TASKS_FILE, data);
  gistSync.pushToGist().catch(() => {});

  res.json({
    success: true,
    task: targetTask,
    streak: user.streak,
    streakGained,
    progress: {
      total,
      completed: completedCount,
      percent,
      quote: getDopamineQuote(percent),
      isAllCompleted: total > 0 && completedCount === total
    }
  });
});

// POST /api/tasks/create - Add a new task
app.post('/api/tasks/create', (req, res) => {
  const { text, category, recurring, user: reqUser } = req.body;
  const username = reqUser || 'default';

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Task text is required' });
  }

  const data = readJSON(TASKS_FILE) || { users: {} };
  if (!data.users[username]) {
    data.users[username] = { streak: 0, lastCompletedDate: null, lastActiveDate: getTodayDateString(), totalTasksFinished: 0, tasks: [] };
  }

  const newTask = {
    id: `task-${Date.now()}`,
    text: text.trim(),
    category: category || 'General',
    completed: false,
    recurring: recurring !== undefined ? Boolean(recurring) : true,
    completedAt: null
  };

  data.users[username].tasks.push(newTask);
  writeJSON(TASKS_FILE, data);
  gistSync.pushToGist().catch(() => {});

  res.status(201).json({ success: true, task: newTask });
});

// POST /api/tasks/delete - Delete a task
app.post('/api/tasks/delete', (req, res) => {
  const { taskId, user: reqUser } = req.body;
  const username = reqUser || 'default';

  if (!taskId) {
    return res.status(400).json({ success: false, error: 'taskId is required' });
  }

  const data = readJSON(TASKS_FILE) || { users: {} };
  const user = data.users[username];
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  user.tasks = user.tasks.filter(t => t.id !== taskId);
  data.users[username] = user;
  writeJSON(TASKS_FILE, data);
  gistSync.pushToGist().catch(() => {});

  res.json({ success: true, message: 'Task deleted' });
});

// GET /api/gist/status
app.get('/api/gist/status', (req, res) => {
  res.json(gistSync.getStatus());
});

// POST /api/gist/setup
app.post('/api/gist/setup', async (req, res) => {
  try {
    const { token, gistId } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'GitHub Token is required' });
    let result;
    if (gistId && gistId.trim()) {
      result = await gistSync.linkExistingGist(token.trim(), gistId.trim());
    } else {
      result = await gistSync.createGist(token.trim());
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/gist/sync
app.post('/api/gist/sync', async (req, res) => {
  try {
    const pullRes = await gistSync.pullFromGist();
    res.json(pullRes);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/health & Network Info
app.get('/api/health', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const localIps = [];

  for (const ifaceName of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIps.push({ iface: ifaceName, ip: iface.address, port: PORT });
      }
    }
  }

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    localIps,
    mobileWidgetUrl: localIps.length > 0 ? `http://${localIps[0].ip}:${PORT}` : `http://localhost:${PORT}`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  // Pull from Gist on server boot if configured
  gistSync.pullFromGist().then(r => {
    if (r.success) console.log('☁️ Synced state from GitHub Gist on startup.');
  }).catch(() => {});

  console.log(`\n==================================================`);
  console.log(`🚀 AI Cockpit server running at http://localhost:${PORT}`);
  console.log(`📱 Mobile/LAN URL:`);
  const networkInterfaces = os.networkInterfaces();
  for (const ifaceName of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   - http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log(`==================================================\n`);
});
