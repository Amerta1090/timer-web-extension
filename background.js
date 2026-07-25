browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "timer-alarm") {
    const data = await browser.storage.local.get(["totalSeconds", "state"]);

    await browser.storage.local.set({
      totalSeconds: 0,
      state: "idle",
      savedAt: Date.now(),
    });

    browser.notifications.create("timer-done", {
      type: "basic",
      iconUrl: "icons/icon-96.png",
      title: "Timer Selesai!",
      message: "Waktumu sudah habis.",
      priority: 2,
    });

    browser.browserAction.setBadgeText({ text: "" });
  }
});