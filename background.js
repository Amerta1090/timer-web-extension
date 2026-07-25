browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "quick-1h" || msg.action === "quick-30m") {
    browser.runtime.sendMessage(msg).catch(() => {});
  }
});

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

browser.alarms.onAlarm.addListener(async (alarm) => {
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