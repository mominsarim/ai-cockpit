# AI Cockpit | AI-Driven Productivity Cockpit (Dual Widget System)

A unified, high-performance productivity HUD engineered to run seamlessly as a **Desktop Live Wallpaper (Wallpaper Engine / Rainmeter)**, **Web Widget**, and **Mobile PWA**, syncing in real-time through a lightweight Node.js/Express server.

---

## ⚡ Architecture Overview

```
AI Cockpit
├── server/
│   ├── server.js              # Express REST API + Auto-reset at midnight + LAN auto-discovery
│   └── data/
│       ├── feeds.json         # Editable curated AI/Tech/Engineering/Startups headlines
│       └── tasks.json         # Persistent user tasks, daily streaks, & completion timestamps
├── public/
│   ├── index.html             # Master HUD interface (Glassmorphism + Cyberpunk styling)
│   ├── manifest.json          # Mobile PWA manifest (Installable on iOS & Android)
│   ├── sw.js                  # Service Worker for offline asset caching
│   ├── css/style.css          # Design system (HSL colors, opacity/blur sliders, Ghost mode)
│   └── js/
│       ├── app.js             # State engine, server sync, optimistic UI, Wallpaper Engine bridge
│       ├── audio.js           # Web Audio API synthesizer for mechanical clicks & victory fanfare
│       └── confetti.js        # High-performance canvas particle burst (0% idle CPU footprint)
├── project.json               # Native Wallpaper Engine configuration file
└── package.json               # Node.js project manifest
```

---

## 🚀 Quick Start

### 1. Install & Launch Server
```bash
npm install
npm start
```
The server will boot and display your local and Wi-Fi LAN addresses:
- **Desktop Widget**: `http://localhost:3000`
- **Mobile PWA (on same Wi-Fi)**: `http://<your-lan-ip>:3000` (e.g. `http://192.168.1.4:3000`)

---

## 🖥️ Running as a Live Wallpaper

### Option A: Wallpaper Engine
1. Open **Wallpaper Engine**.
2. Click **Wallpaper Editor** → **Create Wallpaper** (or **Open Wallpaper from File**).
3. Select `project.json` or `public/index.html` inside `d:\Projects\AI Cockpit`.
4. Alternatively, choose **Add Web Wallpaper** and enter URL: `http://localhost:3000`.
5. You can customize **HUD Glass Opacity**, **Backdrop Blur**, **Accent Color**, and **Ghost Mode** directly from the Wallpaper Engine UI!

### Option B: Rainmeter (WebView Plugin)
1. Use a Rainmeter skin utilizing the `WebView2` plugin (such as [WebNowPlaying](https://github.com/keifufu/WebNowPlaying) or WebView skin templates).
2. Point the WebView URL to `http://localhost:3000`.

### Option C: Standalone Desktop Window
- Run in Chrome / Edge in app mode:
  ```bash
  chrome.exe --app="http://localhost:3000" --window-size=1280,720
  ```

---

## 📱 Mobile PWA Installation (iOS & Android)

1. Ensure your phone is connected to the same Wi-Fi network as your desktop.
2. Open Safari (iOS) or Chrome (Android) and navigate to the LAN URL displayed in the **⚙️ Tuning** drawer (e.g., `http://192.168.1.4:3000`).
3. Tap **Share** → **Add to Home Screen** (iOS) or the **Install App** banner (Android).
4. The Cockpit will run full-screen without address bars and sync tasks instantly with your desktop wallpaper.

---

## 🧠 Core Features & Wallpaper Ergonomics

### 1. Innovation Feed Module
- **Curated Streams**: Categories include `#AI`, `#Tech`, `#Engineering`, and `#Startups`.
- **Spotlight Rotation**: Auto-cycling featured headline cards every 10 seconds.
- **Instant Publishing**: Add personal breakthroughs or notes directly via the `+` button or edit `server/data/feeds.json`.

### 2. Dopamine To-Do Dashboard
- **Streak Flame**: Live streak counter that tracks consecutive days of task completion.
- **Dynamic Motivational Quotes**: Compelling cues that adapt to your completion percentage (`0%`, `20%`, `50%`, `75%`, `100%`).
- **Audio Feedback**: Synthesized futuristic clicks and triumphant victory fanfares via Web Audio API (zero audio files needed, works instantly offline).
- **Confetti Particle Burst**: Canvas celebration upon clearing your daily mission list.
- **Auto-Reset at Midnight**: Daily recurring tasks automatically reset at midnight without losing streak data.

### 3. Wallpaper Tunables (Under `⚙️ Tuning`)
- **HUD Glass Opacity**: Adjust transparency from 20% to 100% so your background wallpaper artwork shows through.
- **Backdrop Blur**: Custom CSS backdrop blur slider (0px to 30px).
- **Theme Swatches**: One-click switching between **Cyber Cyan**, **Matrix Emerald**, **Solar Amber**, and **Midnight Violet**.
- **Ambient Ghost Mode**: Automatically dims the widget into a low-contrast HUD after 15 seconds of inactivity to eliminate distractions; gently awakens when you move your cursor or tap the screen.
