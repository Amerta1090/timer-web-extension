(() => {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");

  let badgeTimer = null;

  function computeBadge(remaining) {
    if (!remaining || remaining <= 0) return "";
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    let badge = `${h > 0 ? h + "h" : ""}${m > 0 ? m + "m" : s + "s"}`;
    return badge;
  }

  async function updateBadge() {
    const data = await browser.storage.local.get(["badgeState"]);
    const state = data.badgeState;
    if (!state || state.remaining <= 0) {
      browser.browserAction.setBadgeText({ text: "" });
      badgeTimer = null;
      return;
    }
    const elapsed = Math.floor((Date.now() - state.savedAt) / 1000);
    const remaining = Math.max(0, state.remaining - elapsed);
    const badge = computeBadge(remaining);
    browser.browserAction.setBadgeText({ text: badge });
    browser.browserAction.setBadgeBackgroundColor({ color: "#4fc3f7" });
    if (remaining > 0) {
      badgeTimer = { remaining, savedAt: Date.now() };
    } else {
      badgeTimer = null;
    }
  }

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "timer-update") {
      browser.storage.local.set({ badgeState: { remaining: msg.remaining, savedAt: Date.now() } });
      updateBadge();
      browser.alarms.create("badge-update", { periodInMinutes: 1 });
    }
    if (msg.action === "timer-stop") {
      browser.storage.local.set({ badgeState: null });
      browser.browserAction.setBadgeText({ text: "" });
      browser.alarms.clear("badge-update");
      badgeTimer = null;
    }
    if (msg.action === "badge-sync") {
      updateBadge();
    }
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "badge-update") {
      await updateBadge();
    }
    if (alarm.name.startsWith("timer-")) {
      browser.notifications.create("done-" + Date.now(), {
        type: "basic",
        iconUrl: "icons/icon-96.png",
        title: "Timer Selesai!",
        message: "Waktumu sudah habis.",
        priority: 2,
      });
    }
  });

  // Restore badge on service worker wake
  updateBadge();

  // ═══ Keyboard Shortcuts (existing) ═══
  browser.commands.onCommand.addListener((command) => {
    if (command === "quick-1h") {
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, { action: "quick-1h" }).catch(() => {});
        }
      });
      browser.notifications.create("cmd-" + Date.now(), {
        type: "basic",
        iconUrl: "icons/icon-96.png",
        title: "Quick Timer",
        message: "Timer 1 Jam dimulai!",
        priority: 1,
      });
    }
    if (command === "quick-30m") {
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, { action: "quick-30m" }).catch(() => {});
        }
      });
      browser.notifications.create("cmd-" + Date.now(), {
        type: "basic",
        iconUrl: "icons/icon-96.png",
        title: "Quick Timer",
        message: "Timer 30 Menit dimulai!",
        priority: 1,
      });
    }
  });
})();
