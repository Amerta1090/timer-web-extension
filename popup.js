(() => {
  "use strict";

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => (p || document).querySelectorAll(s);
  const pad = (n) => String(n).padStart(2, "0");

  const RING_CIRCUMFERENCE = 2 * Math.PI * 30;

  let timers = [];
  let activeTimerId = null;
  let settings = {
    sound: "bell",
    volume: 70,
    tabTitle: true,
    theme: "dark",
  };
  let customPresets = [];
  let history = [];

  // ═══ Sound Generation ═══
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
  }

  function playSound(type) {
    if (type === "none") return;
    try {
      const ctx = getAudioCtx();
      const vol = settings.volume / 100;
      if (type === "bell") playBellSound(ctx, vol);
      else if (type === "digital") playDigitalSound(ctx, vol);
      else if (type === "gentle") playGentleSound(ctx, vol);
    } catch (e) {}
  }

  function playBellSound(ctx, vol) {
    [0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + t + 0.15);
      gain.gain.setValueAtTime(0.4 * vol, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
  }

  function playDigitalSound(ctx, vol) {
    [1200, 1000, 1200, 800].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.12);
    });
  }

  function playGentleSound(ctx, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.4);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.25 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  }

  // ═══ Timer Engine ═══
  function createTimer(totalSec, label) {
    return {
      id: Date.now() + Math.random(),
      label: label || "",
      initialSeconds: totalSec,
      remaining: totalSec,
      state: "running",
      intervalId: null,
      createdAt: Date.now(),
    };
  }

  function startTimerEngine(timer) {
    if (timer.remaining <= 0) return;
    timer.state = "running";
    renderTimers();
    timer.intervalId = setInterval(() => {
      timer.remaining--;
      updateTimerCard(timer);
      updateTabTitle();
      if (timer.remaining <= 0) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
        timer.state = "finished";
        playSound(settings.sound);
        addHistory(timer.label, timer.initialSeconds);
        notifyFinished(timer.label, timer.initialSeconds);
        renderTimers();
        updateTabTitle();
        saveAll();
      }
    }, 1000);
    saveAll();
  }

  function pauseTimer(id) {
    const t = timers.find((x) => x.id === id);
    if (!t || t.state !== "running") return;
    clearInterval(t.intervalId);
    t.intervalId = null;
    t.state = "paused";
    renderTimers();
    saveAll();
  }

  function startOrResumeTimer(id) {
    const t = timers.find((x) => x.id === id);
    if (!t) return;
    if (t.state === "paused" || t.state === "idle") {
      if (t.remaining <= 0) t.remaining = t.initialSeconds;
      if (t.remaining > 0) {
        startTimerEngine(t);
      }
    }
  }

  function resetTimer(id) {
    const t = timers.find((x) => x.id === id);
    if (!t) return;
    if (t.intervalId) clearInterval(t.intervalId);
    t.intervalId = null;
    t.remaining = t.initialSeconds;
    t.state = "idle";
    renderTimers();
    updateTabTitle();
    saveAll();
  }

  function removeTimer(id) {
    const t = timers.find((x) => x.id === id);
    if (t && t.intervalId) clearInterval(t.intervalId);
    timers = timers.filter((x) => x.id !== id);
    if (activeTimerId === id) activeTimerId = timers.length ? timers[0].id : null;
    renderTimers();
    updateTabTitle();
    saveAll();
  }

  function addTimeToTimer(id, sec) {
    const t = timers.find((x) => x.id === id);
    if (!t) return;
    t.remaining += sec;
    t.initialSeconds = Math.max(t.initialSeconds, t.remaining);
    if (t.state === "idle") {
      startTimerEngine(t);
    } else if (t.state === "finished") {
      t.state = "running";
      startTimerEngine(t);
    }
    renderTimers();
    saveAll();
  }

  function startPreset(minutes) {
    const sec = minutes * 60;
    const existingIdle = timers.find((t) => t.state === "idle");
    if (existingIdle) {
      existingIdle.initialSeconds = sec;
      existingIdle.remaining = sec;
      startTimerEngine(existingIdle);
    } else {
      const t = createTimer(sec, "");
      timers.unshift(t);
      activeTimerId = t.id;
      startTimerEngine(t);
    }
    renderTimers();
    updateTabTitle();
  }

  // ═══ History ═══
  function addHistory(label, seconds) {
    history.unshift({
      label: label || "Timer",
      duration: seconds,
      finishedAt: Date.now(),
    });
    if (history.length > 50) history = history.slice(0, 50);
    saveAll();
  }

  function clearHistory() {
    history = [];
    saveAll();
    renderHistory();
  }

  // ═══ Notifications ═══
  function notifyFinished(label, seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    let durStr = "";
    if (h > 0) durStr += h + " jam ";
    if (m > 0) durStr += m + " menit";
    durStr = durStr.trim() || seconds + " detik";
    const title = label || "Timer";
    browser.notifications.create("timer-" + Date.now(), {
      type: "basic",
      iconUrl: "icons/icon-96.png",
      title: `${title} selesai!`,
      message: `Durasi: ${durStr}`,
      priority: 2,
    });
  }

  // ═══ Tab Title ═══
  function updateTabTitle() {
    if (!settings.tabTitle) {
      document.title = "Quick Timer Pro";
      browser.browserAction.setBadgeText({ text: "" });
      return;
    }
    const running = timers.filter((t) => t.state === "running");
    if (running.length === 0) {
      document.title = "Quick Timer Pro";
      browser.browserAction.setBadgeText({ text: "" });
      return;
    }
    const first = running[0];
    const h = Math.floor(first.remaining / 3600);
    const m = Math.floor((first.remaining % 3600) / 60);
    const s = first.remaining % 60;
    let timeStr = "";
    if (h > 0) timeStr = `${h}h${pad(m)}`;
    else if (m > 0) timeStr = `${m}m${pad(s)}s`;
    else timeStr = `${s}s`;
    document.title = `${timeStr} — Quick Timer Pro`;
    let badge = `${h > 0 ? h + "h" : ""}${m > 0 ? m + "m" : s + "s"}`;
    if (running.length > 1) badge = running.length + "x";
    browser.browserAction.setBadgeText({ text: badge });
    browser.browserAction.setBadgeBackgroundColor({ color: "#4fc3f7" });
  }

  // ═══ Persistence ═══
  async function saveAll() {
    const timerData = timers.map((t) => ({
      id: t.id,
      label: t.label,
      initialSeconds: t.initialSeconds,
      remaining: t.remaining,
      state: t.state === "running" ? "running" : t.state,
      savedAt: Date.now(),
    }));
    await browser.storage.local.set({
      timers: timerData,
      settings,
      customPresets,
      history,
    });
  }

  async function loadAll() {
    const data = await browser.storage.local.get([
      "timers",
      "settings",
      "customPresets",
      "history",
    ]);
    if (data.settings) Object.assign(settings, data.settings);
    if (data.customPresets) customPresets = data.customPresets;
    if (data.history) history = data.history;

    if (data.timers && data.timers.length) {
      data.timers.forEach((td) => {
        const t = {
          id: td.id,
          label: td.label || "",
          initialSeconds: td.initialSeconds,
          remaining: td.remaining,
          state: "idle",
          intervalId: null,
          createdAt: td.savedAt || Date.now(),
        };
        if (td.state === "running" && t.remaining > 0) {
          const elapsed = Math.floor((Date.now() - td.savedAt) / 1000);
          t.remaining = Math.max(0, t.remaining - elapsed);
        }
        if (t.remaining <= 0 && td.state === "running") {
          t.state = "finished";
          playSound(settings.sound);
          addHistory(t.label, t.initialSeconds);
        } else if (td.state === "running" && t.remaining > 0) {
          t.state = "running";
          setTimeout(() => startTimerEngine(t), 100);
        } else {
          t.state = td.state || "idle";
        }
        timers.push(t);
      });
    }
  }

  // ═══ Rendering ═══
  function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m`;
    return `${sec}d`;
  }

  function formatDate(ts) {
    const diffMs = Date.now() - ts;
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return "Baru saja";
    if (diffM < 60) return `${diffM} menit lalu`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH} jam lalu`;
    return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  function getProgressColor(idx) {
    const colors = ["#4fc3f7", "#ab47bc", "#66bb6a", "#ffa726", "#ef5350", "#ec407a"];
    return colors[idx % colors.length];
  }

  function getStatusText(state) {
    if (state === "running") return "Berjalan...";
    if (state === "paused") return "Dijeda";
    if (state === "finished") return "Selesai!";
    return "Siap";
  }

  function getTimerCardId(id) {
    return "tc-" + String(id).replace(".", "-");
  }

  // ═══ Lightweight tick update — no DOM rebuild ═══
  function updateTimerCard(timer) {
    const cardId = getTimerCardId(timer.id);
    const card = document.getElementById(cardId);
    if (!card) return;

    const pct = timer.initialSeconds > 0 ? timer.remaining / timer.initialSeconds : 0;
    const offset = RING_CIRCUMFERENCE * (1 - pct);

    const timeEl = card.querySelector(".time-value");
    if (timeEl) timeEl.textContent = formatTime(timer.remaining);

    const pctEl = card.querySelector(".progress-ring-text");
    if (pctEl) pctEl.textContent = Math.round(pct * 100) + "%";

    const barEl = card.querySelector(".progress-ring-bar");
    if (barEl) barEl.setAttribute("stroke-dashoffset", offset);
  }

  // ═══ Full render — only on structural changes ═══
  function renderTimers() {
    const container = $("#timers-container");
    if (!container) return;

    if (timers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <p>Belum ada timer aktif</p>
          <p style="font-size:11px;margin-top:4px;color:var(--text-tertiary)">Klik preset atau buat timer baru</p>
        </div>`;
      return;
    }

    container.innerHTML = timers.map((t, idx) => {
      const pct = t.initialSeconds > 0 ? t.remaining / t.initialSeconds : 0;
      const offset = RING_CIRCUMFERENCE * (1 - pct);
      const color = getProgressColor(idx);
      const stateClass = t.state === "running" ? " running" : t.state === "finished" ? " finished" : t.state === "paused" ? " paused" : "";

      let controlsHtml = "";
      if (t.state === "finished") {
        controlsHtml = `
          <div class="timer-card-controls">
            <button class="btn btn-ghost btn-sm" data-action="reset" data-id="${t.id}">Reset</button>
          </div>
          <div class="snooze-row">
            <button class="btn btn-sm" data-action="add" data-id="${t.id}" data-sec="300">+5 Mnt</button>
            <button class="btn btn-sm" data-action="add" data-id="${t.id}" data-sec="900">+15 Mnt</button>
            <button class="btn btn-sm" data-action="add" data-id="${t.id}" data-sec="1800">+30 Mnt</button>
          </div>`;
      } else if (t.state === "running") {
        controlsHtml = `
          <div class="timer-card-controls">
            <button class="btn btn-ghost btn-sm" data-action="pause" data-id="${t.id}">Jeda</button>
            <button class="btn btn-ghost btn-sm" data-action="reset" data-id="${t.id}">Reset</button>
          </div>
          <div class="timer-card-add-row">
            <button class="btn btn-ghost btn-sm" data-action="add" data-id="${t.id}" data-sec="60">+1m</button>
            <button class="btn btn-ghost btn-sm" data-action="add" data-id="${t.id}" data-sec="300">+5m</button>
            <button class="btn btn-ghost btn-sm" data-action="add" data-id="${t.id}" data-sec="900">+15m</button>
            <button class="btn btn-ghost btn-sm" data-action="add" data-id="${t.id}" data-sec="1800">+30m</button>
          </div>`;
      } else if (t.state === "paused") {
        controlsHtml = `
          <div class="timer-card-controls">
            <button class="btn btn-primary btn-sm" data-action="resume" data-id="${t.id}">Lanjut</button>
            <button class="btn btn-ghost btn-sm" data-action="reset" data-id="${t.id}">Reset</button>
          </div>`;
      } else {
        controlsHtml = `
          <div class="timer-card-controls">
            <button class="btn btn-primary btn-sm" data-action="start" data-id="${t.id}">Mulai</button>
            <button class="btn btn-ghost btn-sm" data-action="reset" data-id="${t.id}">Reset</button>
          </div>`;
      }

      return `
        <div id="${getTimerCardId(t.id)}" class="timer-card${stateClass}" style="--card-accent:${color};--card-accent-glow:${color}33" data-timer-id="${t.id}">
          <div class="timer-card-header">
            <input class="timer-label-input" type="text" placeholder="Beri label..." value="${t.label}" data-action="set-label" data-id="${t.id}" maxlength="30">
            <div class="timer-card-actions">
              <button class="icon-btn" data-action="remove" data-id="${t.id}" title="Hapus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="timer-display-row">
            <div class="progress-ring-container">
              <svg class="progress-ring" width="72" height="72" viewBox="0 0 72 72">
                <circle class="progress-ring-bg" cx="36" cy="36" r="30"/>
                <circle class="progress-ring-bar" cx="36" cy="36" r="30"
                  stroke-dasharray="${RING_CIRCUMFERENCE}"
                  stroke-dashoffset="${offset}"/>
              </svg>
              <div class="progress-ring-text">${Math.round(pct * 100)}%</div>
            </div>
            <div class="timer-time-display">
              <div class="time-value">${formatTime(t.remaining)}</div>
              <div class="time-status">${getStatusText(t.state)}</div>
            </div>
          </div>
          ${controlsHtml}
        </div>`;
    }).join("");
  }

  function renderPresets() {
    const list = $("#custom-presets-list");
    if (!list) return;
    if (customPresets.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:20px"><p>Belum ada preset tersimpan</p></div>`;
      return;
    }
    list.innerHTML = customPresets.map((p, i) => `
      <div class="preset-item">
        <div class="preset-dot" style="background:${p.color}"></div>
        <div class="preset-info">
          <div class="preset-name">${p.name}</div>
          <div class="preset-duration">${formatDuration(p.seconds)}</div>
        </div>
        <div class="preset-actions">
          <button class="icon-btn" data-action="run-preset" data-idx="${i}" title="Mulai">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21 5,3"/></svg>
          </button>
          <button class="icon-btn" data-action="delete-preset" data-idx="${i}" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`).join("");
  }

  function renderHistory() {
    const list = $("#history-list");
    if (!list) return;
    if (history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
          <p>Belum ada riwayat</p>
        </div>`;
      return;
    }
    list.innerHTML = history.map((h) => `
      <div class="history-item">
        <div class="history-icon" style="background:var(--accent-bg);color:var(--accent)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
        </div>
        <div class="history-info">
          <div class="history-label">${h.label || "Timer"}</div>
          <div class="history-meta">${formatDate(h.finishedAt)}</div>
        </div>
        <div class="history-duration">${formatDuration(h.duration)}</div>
      </div>`).join("");
  }

  function renderAll() {
    renderTimers();
    renderPresets();
    renderHistory();
    applyTheme();
    applySettings();
    updateTabTitle();
  }

  // ═══ Theme ═══
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }

  function toggleTheme() {
    settings.theme = settings.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveAll();
  }

  function applySettings() {
    const soundSel = $("#sound-select");
    const volSlider = $("#volume-slider");
    const volVal = $("#volume-value");
    const tabToggle = $("#toggle-tab-title");
    if (soundSel) soundSel.value = settings.sound;
    if (volSlider) volSlider.value = settings.volume;
    if (volVal) volVal.textContent = settings.volume + "%";
    if (tabToggle) tabToggle.checked = settings.tabTitle;
  }

  // ═══ Toast ═══
  function showToast(msg) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }

  // ═══ Event Delegation ═══
  function handleTimerActions(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseFloat(btn.dataset.id);
    const sec = parseInt(btn.dataset.sec, 10);
    const idx = parseInt(btn.dataset.idx, 10);

    switch (action) {
      case "start":
      case "resume":
        startOrResumeTimer(id);
        break;
      case "pause":
        pauseTimer(id);
        break;
      case "reset":
        resetTimer(id);
        break;
      case "remove":
        removeTimer(id);
        break;
      case "add":
        addTimeToTimer(id, sec);
        break;
      case "run-preset":
        if (customPresets[idx]) startPreset(Math.round(customPresets[idx].seconds / 60));
        break;
      case "delete-preset":
        customPresets.splice(idx, 1);
        renderPresets();
        saveAll();
        showToast("Preset dihapus");
        break;
    }
  }

  function handleLabelInput(e) {
    if (e.target.dataset.action !== "set-label") return;
    const id = parseFloat(e.target.dataset.id);
    const t = timers.find((x) => x.id === id);
    if (t) {
      t.label = e.target.value;
      saveAll();
      updateTabTitle();
    }
  }

  // ═══ Init ═══
  async function init() {
    await loadAll();
    renderAll();

    // Tab switching
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        $$(".panel").forEach((p) => p.classList.remove("active"));
        const panel = $(`#panel-${tab.dataset.tab}`);
        if (panel) panel.classList.add("active");
      });
    });

    // Preset quick buttons
    $$(".btn-preset[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => startPreset(parseInt(btn.dataset.preset, 10)));
    });

    // Add time buttons
    $$(".btn-add[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sec = parseInt(btn.dataset.add, 10);
        if (timers.length > 0) {
          const first = timers.find((t) => t.state !== "idle") || timers[0];
          addTimeToTimer(first.id, sec);
        } else {
          const t = createTimer(sec, "");
          timers.unshift(t);
          activeTimerId = t.id;
          startTimerEngine(t);
          renderTimers();
          updateTabTitle();
        }
      });
    });

    // Manual set
    const btnSet = $("#btn-set");
    if (btnSet) {
      btnSet.addEventListener("click", () => {
        const h = parseInt($("#input-hours").value, 10) || 0;
        const m = parseInt($("#input-minutes").value, 10) || 0;
        const s = parseInt($("#input-seconds").value, 10) || 0;
        const total = h * 3600 + m * 60 + s;
        if (total <= 0) return;
        const existingIdle = timers.find((t) => t.state === "idle");
        if (existingIdle) {
          existingIdle.initialSeconds = total;
          existingIdle.remaining = total;
          startTimerEngine(existingIdle);
        } else {
          const t = createTimer(total, "");
          timers.unshift(t);
          activeTimerId = t.id;
          startTimerEngine(t);
        }
        renderTimers();
        updateTabTitle();
        $("#input-hours").value = 0;
        $("#input-minutes").value = 0;
        $("#input-seconds").value = 0;
      });
    }

    ["input-hours", "input-minutes", "input-seconds"].forEach((id) => {
      const el = $(`#${id}`);
      if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") btnSet.click(); });
    });

    // Add timer button
    const btnAddTimer = $("#btn-add-timer");
    if (btnAddTimer) {
      btnAddTimer.addEventListener("click", () => {
        const t = createTimer(0, "");
        t.state = "idle";
        timers.push(t);
        activeTimerId = t.id;
        renderTimers();
        saveAll();
      });
    }

    // Timer action delegation
    const container = $("#timers-container");
    if (container) {
      container.addEventListener("click", handleTimerActions);
      container.addEventListener("input", handleLabelInput);
    }

    // Preset panel actions
    const presetsPanel = $("#panel-presets");
    if (presetsPanel) {
      presetsPanel.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.idx, 10);
        if (action === "run-preset" && customPresets[idx]) {
          startPreset(Math.round(customPresets[idx].seconds / 60));
          $$(".tab")[0].click();
        } else if (action === "delete-preset") {
          customPresets.splice(idx, 1);
          renderPresets();
          saveAll();
          showToast("Preset dihapus");
        }
      });
    }

    // Color dots
    $$(".color-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        $$(".color-dot").forEach((d) => d.classList.remove("active"));
        dot.classList.add("active");
      });
    });

    // Save preset
    const btnSavePreset = $("#btn-save-preset");
    if (btnSavePreset) {
      btnSavePreset.addEventListener("click", () => {
        const name = $("#preset-name").value.trim();
        if (!name) { showToast("Isi nama preset"); return; }
        const h = parseInt($("#preset-hours").value, 10) || 0;
        const m = parseInt($("#preset-minutes").value, 10) || 0;
        const s = parseInt($("#preset-seconds").value, 10) || 0;
        const total = h * 3600 + m * 60 + s;
        if (total <= 0) { showToast("Set durasi dulu"); return; }
        const color = $(".color-dot.active")?.dataset.color || "#4fc3f7";
        customPresets.push({ name, seconds: total, color });
        renderPresets();
        saveAll();
        showToast("Preset disimpan!");
        $("#preset-name").value = "";
        $("#preset-hours").value = 0;
        $("#preset-minutes").value = 0;
        $("#preset-seconds").value = 0;
      });
    }

    // Clear history
    const btnClearHistory = $("#btn-clear-history");
    if (btnClearHistory) {
      btnClearHistory.addEventListener("click", () => {
        if (history.length === 0) return;
        clearHistory();
        showToast("Riwayat dihapus");
      });
    }

    // Theme toggle
    const btnTheme = $("#btn-theme");
    if (btnTheme) btnTheme.addEventListener("click", toggleTheme);

    // Settings
    const btnSettings = $("#btn-settings");
    const btnCloseSettings = $("#btn-close-settings");
    const settingsOverlay = $("#settings-overlay");
    if (btnSettings && settingsOverlay) {
      btnSettings.addEventListener("click", () => {
        applySettings();
        settingsOverlay.classList.remove("hidden");
      });
    }
    if (btnCloseSettings && settingsOverlay) {
      btnCloseSettings.addEventListener("click", () => settingsOverlay.classList.add("hidden"));
    }
    if (settingsOverlay) {
      settingsOverlay.addEventListener("click", (e) => {
        if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
      });
    }

    const soundSelect = $("#sound-select");
    if (soundSelect) {
      soundSelect.addEventListener("change", () => {
        settings.sound = soundSelect.value;
        saveAll();
      });
    }

    const volSlider = $("#volume-slider");
    const volVal = $("#volume-value");
    if (volSlider) {
      volSlider.addEventListener("input", () => {
        settings.volume = parseInt(volSlider.value, 10);
        if (volVal) volVal.textContent = settings.volume + "%";
      });
      volSlider.addEventListener("change", () => saveAll());
    }

    const tabToggle = $("#toggle-tab-title");
    if (tabToggle) {
      tabToggle.addEventListener("change", () => {
        settings.tabTitle = tabToggle.checked;
        updateTabTitle();
        saveAll();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "T") {
        e.preventDefault();
        startPreset(60);
        showToast("Timer 1 Jam dimulai!");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "Y") {
        e.preventDefault();
        startPreset(30);
        showToast("Timer 30 Menit dimulai!");
      }
    });

    // Command listener from background
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.action === "quick-1h") { startPreset(60); showToast("Timer 1 Jam dimulai!"); }
      if (msg.action === "quick-30m") { startPreset(30); showToast("Timer 30 Menit dimulai!"); }
    });
  }

  init();
})();