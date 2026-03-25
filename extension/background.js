import { api } from "./api.js";

const ALARM_NAME = "session-timer";

// --- Local state helpers ---

async function getLocalRun() {
  const { localRun } = await chrome.storage.local.get("localRun");
  return localRun || null;
}

async function setLocalRun(run) {
  await chrome.storage.local.set({ localRun: run });
}

async function clearLocalRun() {
  await chrome.storage.local.remove(["localRun", "sessionTabId"]);
  await chrome.alarms.clear(ALARM_NAME);
}

function getSessions(run) {
  return [...run.plan.sessions].sort((a, b) => a.order - b.order);
}

// --- Tab management ---

async function openSessionTab(url) {
  const { sessionTabId } = await chrome.storage.local.get("sessionTabId");
  try {
    if (sessionTabId) {
      await chrome.tabs.update(sessionTabId, { url, active: true });
      return sessionTabId;
    }
  } catch (_) {}
  const tab = await chrome.tabs.create({ url, active: true });
  await chrome.storage.local.set({ sessionTabId: tab.id });
  return tab.id;
}

// --- Alarm ---

async function setSessionAlarm(run) {
  const sessions = getSessions(run);
  const session = sessions[run.current_session_index];
  const elapsed = (Date.now() - new Date(run.session_started_at).getTime()) / 60000;
  const remaining = Math.max(0.5, session.duration_minutes - elapsed);
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: remaining });
}

// --- Alarm handler: session time up ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const run = await getLocalRun();
  if (!run || run.status !== "running") return;

  try {
    const updated = await api.advanceRun(run.id);
    if (updated.status === "completed") {
      await clearLocalRun();
      chrome.runtime.sendMessage({ type: "RUN_COMPLETED" }).catch(() => {});
    } else {
      await setLocalRun(updated);
      const sessions = getSessions(updated);
      const session = sessions[updated.current_session_index];
      await openSessionTab(session.url);
      await setSessionAlarm(updated);
      chrome.runtime.sendMessage({ type: "SESSION_ADVANCED", run: updated }).catch(() => {});
    }
  } catch (err) {
    console.error("Failed to advance run:", err);
  }
});

// --- Lock mode: enforce single tab ---

chrome.tabs.onCreated.addListener(async (tab) => {
  const run = await getLocalRun();
  if (!run || !run.lock_mode || run.status !== "running") return;
  const { sessionTabId } = await chrome.storage.local.get("sessionTabId");
  if (tab.id !== sessionTabId) {
    chrome.tabs.remove(tab.id);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;
  const run = await getLocalRun();
  if (!run || !run.lock_mode || run.status !== "running") return;
  const { sessionTabId } = await chrome.storage.local.get("sessionTabId");
  if (tabId !== sessionTabId) return;

  const sessions = getSessions(run);
  const currentOrigin = new URL(sessions[run.current_session_index].url).origin;
  if (!changeInfo.url.startsWith(currentOrigin)) {
    chrome.tabs.update(tabId, { url: sessions[run.current_session_index].url });
  }
});

// --- Message handler ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(msg) {
  switch (msg.type) {
    case "START_RUN": {
      const run = await api.startRun(msg.planId, msg.lockMode || false);
      await setLocalRun(run);
      const sessions = getSessions(run);
      await openSessionTab(sessions[0].url);
      await setSessionAlarm(run);
      return { run };
    }

    case "GET_RUN": {
      return { run: await getLocalRun() };
    }

    case "PAUSE_RUN": {
      const run = await getLocalRun();
      if (!run) throw new Error("No active run");
      const updated = await api.pauseRun(run.id);
      await setLocalRun(updated);
      await chrome.alarms.clear(ALARM_NAME);
      return { run: updated };
    }

    case "RESUME_RUN": {
      const run = await getLocalRun();
      if (!run) throw new Error("No active run");
      const updated = await api.resumeRun(run.id);
      await setLocalRun(updated);
      await setSessionAlarm(updated);
      return { run: updated };
    }

    case "ADVANCE_RUN": {
      const run = await getLocalRun();
      if (!run) throw new Error("No active run");
      const updated = await api.advanceRun(run.id);
      if (updated.status === "completed") {
        await clearLocalRun();
      } else {
        await setLocalRun(updated);
        const sessions = getSessions(updated);
        await openSessionTab(sessions[updated.current_session_index].url);
        await setSessionAlarm(updated);
      }
      return { run: updated };
    }

    case "ABANDON_RUN": {
      const run = await getLocalRun();
      if (!run) throw new Error("No active run");
      await api.abandonRun(run.id);
      await clearLocalRun();
      return { success: true };
    }

    default:
      throw new Error(`Unknown message: ${msg.type}`);
  }
}
