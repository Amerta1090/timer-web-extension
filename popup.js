const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let totalSeconds = 0;
let intervalId = null;
let state = "idle"; // idle, running, paused, finished

const hoursEl = $("#hours");
const minutesEl = $("#minutes");
const secondsEl = $("#seconds");
const displayEl = $("#timer-display");
const statusEl = $("#status");

const btnStart = $("#btn-start");
const btnPause = $("#btn-pause");
const btnReset = $("#btn-reset");
const btnSet = $("#btn-set");

const inputH = $("#input-hours");
const inputM = $("#input-minutes");
const inputS = $("#input-seconds");

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateDisplay() {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  hoursEl.textContent = pad(h);
  minutesEl.textContent = pad(m);
  secondsEl.textContent = pad(s);
  updateBadge(h, m, s);
}

function updateBadge(h, m, s) {
  let text = "";
  if (state === "running") {
    if (h > 0) {
      text = `${h}h${pad(m)}`;
    } else if (m > 0) {
      text = `${m}m`;
    } else {
      text = `${s}s`;
    }
  }
  browser.browserAction.setBadgeText({ text });
  browser.browserAction.setBadgeBackgroundColor({
    color: state === "finished" ? "#ef5350" : "#4fc3f7",
  });
}

function setStatus(txt, cls) {
  statusEl.textContent = txt;
  statusEl.className = "status " + (cls || "");
}

function setDisplayClass(cls) {
  displayEl.className = "timer-display " + (cls || "");
}

function showRunning() {
  btnStart.style.display = "none";
  btnPause.style.display = "block";
  btnPause.textContent = "Jeda";
  setStatus("Berjalan...", "running");
  setDisplayClass("running");
  state = "running";
}

function showPaused() {
  btnStart.style.display = "block";
  btnPause.style.display = "none";
  btnStart.textContent = "Lanjut";
  setStatus("Dijeda", "paused");
  setDisplayClass("");
  state = "paused";
}

function showIdle() {
  btnStart.style.display = "block";
  btnPause.style.display = "none";
  btnStart.textContent = "Mulai";
  setStatus("Siap");
  setDisplayClass("");
  state = "idle";
}

function showFinished() {
  clearInterval(intervalId);
  intervalId = null;
  btnStart.style.display = "block";
  btnPause.style.display = "none";
  btnStart.textContent = "Mulai";
  setStatus("Selesai!", "finished");
  setDisplayClass("finished");
  state = "finished";
  totalSeconds = 0;
  updateDisplay();
  saveState();
}

function startTimer() {
  if (totalSeconds <= 0) return;
  showRunning();
  clearAlarm();
  intervalId = setInterval(tick, 1000);
  saveState();
}

function tick() {
  totalSeconds--;
  updateDisplay();
  if (totalSeconds <= 0) {
    showFinished();
    notifyFinished();
  }
}

function pauseTimer() {
  clearInterval(intervalId);
  intervalId = null;
  clearAlarm();
  showPaused();
  saveState();
}

function resetTimer() {
  clearInterval(intervalId);
  intervalId = null;
  totalSeconds = 0;
  clearAlarm();
  updateDisplay();
  showIdle();
  saveState();
}

function setTimer(h, m, s) {
  totalSeconds = h * 3600 + m * 60 + s;
  if (totalSeconds > 0) {
    updateDisplay();
    if (state === "running" || state === "paused") {
      clearInterval(intervalId);
      intervalId = null;
    }
    startTimer();
  }
}

function addTime(sec) {
  totalSeconds += sec;
  updateDisplay();
  if (state === "idle" || state === "finished") {
    startTimer();
  } else if (state === "paused") {
    showPaused();
  }
  saveState();
}

function clearAlarm() {
  browser.alarms.clear("timer-alarm");
}

function setAlarm(sec) {
  if (sec > 0) {
    browser.alarms.create("timer-alarm", { delayInMinutes: sec / 60 });
  }
}

function notifyFinished() {
  browser.notifications.create("timer-done", {
    type: "basic",
    iconUrl: "icons/icon-96.png",
    title: "Timer Selesai!",
    message: "Waktumu sudah habis.",
    priority: 2,
  });
}

async function saveState() {
  await browser.storage.local.set({
    totalSeconds,
    state,
    savedAt: Date.now(),
  });
}

async function restoreState() {
  const data = await browser.storage.local.get([
    "totalSeconds",
    "state",
    "savedAt",
  ]);

  if (
    (data.state === "running" || data.state === "paused") &&
    data.totalSeconds > 0
  ) {
    const elapsed = Math.floor((Date.now() - data.savedAt) / 1000);
    totalSeconds = Math.max(0, data.totalSeconds - elapsed);

    if (totalSeconds <= 0) {
      showFinished();
      notifyFinished();
      return;
    }

    updateDisplay();

    if (data.state === "running") {
      startTimer();
    } else {
      showPaused();
    }
  } else if (data.state === "finished" && data.totalSeconds === 0) {
    totalSeconds = 0;
    updateDisplay();
    showIdle();
  } else {
    updateDisplay();
  }
}

// Event listeners
btnStart.addEventListener("click", () => {
  if (state === "paused") {
    startTimer();
  } else {
    if (totalSeconds > 0) {
      startTimer();
    }
  }
});

btnPause.addEventListener("click", pauseTimer);
btnReset.addEventListener("click", resetTimer);

$$("[data-minutes]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const min = parseInt(btn.dataset.minutes, 10);
    totalSeconds = min * 60;
    updateDisplay();
    startTimer();
  });
});

$$("[data-seconds]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sec = parseInt(btn.dataset.seconds, 10);
    addTime(sec);
  });
});

btnSet.addEventListener("click", () => {
  const h = parseInt(inputH.value, 10) || 0;
  const m = parseInt(inputM.value, 10) || 0;
  const s = parseInt(inputS.value, 10) || 0;
  setTimer(h, m, s);
});

// Allow Enter in inputs
[inputH, inputM, inputS].forEach((inp) => {
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnSet.click();
  });
});

// Listen for alarm
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timer-alarm") {
    totalSeconds = 0;
    updateDisplay();
    showFinished();
    notifyFinished();
  }
});

restoreState();