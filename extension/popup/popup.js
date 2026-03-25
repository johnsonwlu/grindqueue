import { api } from "../api.js";

const app = document.getElementById("app");
let countdownInterval = null;

function msg(type, data = {}) {
  return chrome.runtime.sendMessage({ type, ...data });
}

function formatTime(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getSessions(run) {
  return [...run.plan.sessions].sort((a, b) => a.order - b.order);
}

function totalMinutes(plan) {
  return plan.sessions.reduce((s, x) => s + x.duration_minutes, 0);
}

// --- Render helpers ---

function renderHeader(showDashboard = true) {
  return `
    <div class="header">
      <span class="logo">GrindQueue</span>
      ${showDashboard ? `<div class="header-actions"><a id="open-dashboard">Dashboard</a></div>` : ""}
    </div>
  `;
}

function renderAuth() {
  app.innerHTML = `
    ${renderHeader(false)}
    <div class="auth-view">
      <h2 id="auth-title">Sign in</h2>
      <div class="form-group">
        <label>Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input id="password" type="password" placeholder="••••••••" />
      </div>
      <div id="auth-error" class="error-msg"></div>
      <button class="btn btn-primary btn-full" id="auth-submit" style="margin-top:10px">Sign in</button>
      <div style="margin-top:10px;text-align:center">
        <button class="link-btn" id="auth-toggle">No account? Register</button>
      </div>
    </div>
  `;

  let isRegister = false;

  document.getElementById("auth-toggle").addEventListener("click", () => {
    isRegister = !isRegister;
    document.getElementById("auth-title").textContent = isRegister ? "Create account" : "Sign in";
    document.getElementById("auth-submit").textContent = isRegister ? "Register" : "Sign in";
    document.getElementById("auth-toggle").textContent = isRegister
      ? "Have an account? Sign in"
      : "No account? Register";
    document.getElementById("auth-error").textContent = "";
  });

  document.getElementById("auth-submit").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errEl = document.getElementById("auth-error");
    errEl.textContent = "";

    try {
      if (isRegister) {
        await api.register(email, password);
        await api.login(email, password);
      } else {
        await api.login(email, password);
      }
      init();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

function renderNoRun(plans) {
  const listHtml = plans.length === 0
    ? `<div class="empty-state">No plans yet. <a id="go-dashboard">Create one in the dashboard.</a></div>`
    : plans.map((p) => {
        const mins = totalMinutes(p);
        const sessions = p.sessions.length;
        return `
          <div class="plan-card">
            <div class="plan-card-info">
              <div class="plan-card-name">${esc(p.name)}</div>
              <div class="plan-card-meta">${sessions} session${sessions !== 1 ? "s" : ""} · ${mins} min</div>
            </div>
            <div class="plan-card-actions">
              <button class="btn btn-sm btn-ghost start-btn" data-id="${p.id}" data-lock="false">Start</button>
              <button class="btn btn-sm btn-danger start-btn" data-id="${p.id}" data-lock="true" title="Lock mode">🔒</button>
            </div>
          </div>
        `;
      }).join("");

  app.innerHTML = `
    ${renderHeader()}
    <div class="no-run-view">
      <h3>Your Plans</h3>
      <div class="plan-list">${listHtml}</div>
    </div>
  `;

  document.getElementById("open-dashboard")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("go-dashboard")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.querySelectorAll(".start-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const planId = parseInt(btn.dataset.id);
      const lockMode = btn.dataset.lock === "true";
      btn.disabled = true;
      try {
        const { run } = await msg("START_RUN", { planId, lockMode });
        renderActiveRun(run);
      } catch (err) {
        btn.disabled = false;
        alert(err.message);
      }
    });
  });
}

function renderActiveRun(run) {
  clearInterval(countdownInterval);

  const sessions = getSessions(run);
  const current = sessions[run.current_session_index];
  const next = sessions[run.current_session_index + 1];
  const isPaused = run.status === "paused";

  const durationMs = current.duration_minutes * 60 * 1000;
  const startedAt = new Date(run.session_started_at).getTime();

  function getRemaining() {
    if (isPaused) return durationMs; // simplified: show full on pause
    return Math.max(0, durationMs - (Date.now() - startedAt));
  }

  function getPct() {
    const elapsed = durationMs - getRemaining();
    return Math.min(100, (elapsed / durationMs) * 100);
  }

  app.innerHTML = `
    ${renderHeader()}
    <div class="run-view">
      ${run.lock_mode ? `<div class="badge badge-lock">🔒 Lock Mode</div>` : ""}
      <div class="session-label">Session ${run.current_session_index + 1} / ${sessions.length}</div>
      <div class="session-title">${esc(current.label || "Untitled")}</div>
      <div class="session-url">${esc(current.url)}</div>
      <div class="countdown${isPaused ? " paused" : ""}" id="countdown">${formatTime(getRemaining())}</div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="progress-fill" style="width:${getPct()}%"></div>
      </div>
      <div class="run-actions">
        ${isPaused
          ? `<button class="btn btn-primary btn-sm" id="resume-btn">Resume</button>`
          : `<button class="btn btn-ghost btn-sm" id="pause-btn">Pause</button>`
        }
        <button class="btn btn-ghost btn-sm" id="skip-btn">Skip →</button>
        <button class="btn btn-danger btn-sm" id="stop-btn">Stop</button>
      </div>
      ${next ? `
        <div class="next-session">
          <div class="next-label">Up next</div>
          <div class="next-title">${esc(next.label || "Untitled")}</div>
          <div class="next-meta">${next.duration_minutes} min · ${esc(next.url)}</div>
        </div>
      ` : `<div class="next-session"><div class="next-label">Final session</div></div>`}
    </div>
  `;

  document.getElementById("open-dashboard")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  if (!isPaused) {
    countdownInterval = setInterval(() => {
      const rem = getRemaining();
      const el = document.getElementById("countdown");
      const fill = document.getElementById("progress-fill");
      if (el) el.textContent = formatTime(rem);
      if (fill) fill.style.width = `${getPct()}%`;
    }, 1000);
  }

  document.getElementById("pause-btn")?.addEventListener("click", async () => {
    const { run: updated } = await msg("PAUSE_RUN");
    renderActiveRun(updated);
  });

  document.getElementById("resume-btn")?.addEventListener("click", async () => {
    const { run: updated } = await msg("RESUME_RUN");
    renderActiveRun(updated);
  });

  document.getElementById("skip-btn")?.addEventListener("click", async () => {
    const { run: updated } = await msg("ADVANCE_RUN");
    if (updated.status === "completed") renderCompleted();
    else renderActiveRun(updated);
  });

  document.getElementById("stop-btn")?.addEventListener("click", async () => {
    if (!confirm("Stop this session?")) return;
    await msg("ABANDON_RUN");
    init();
  });
}

function renderCompleted() {
  clearInterval(countdownInterval);
  app.innerHTML = `
    ${renderHeader()}
    <div class="completed-view">
      <div class="completed-icon">✅</div>
      <h2>Plan Complete</h2>
      <p>Great work. All sessions finished.</p>
      <button class="btn btn-primary" id="back-btn">Back to Plans</button>
    </div>
  `;
  document.getElementById("open-dashboard")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("back-btn").addEventListener("click", init);
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Listen for background events ---

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SESSION_ADVANCED") renderActiveRun(msg.run);
  if (msg.type === "RUN_COMPLETED") renderCompleted();
});

// --- Init ---

async function init() {
  clearInterval(countdownInterval);
  app.innerHTML = `<div class="spinner">Loading…</div>`;

  const loggedIn = await api.isLoggedIn();
  if (!loggedIn) {
    renderAuth();
    return;
  }

  const { run } = await msg("GET_RUN");
  if (run && (run.status === "running" || run.status === "paused")) {
    renderActiveRun(run);
    return;
  }

  try {
    const plans = await api.getPlans();
    renderNoRun(plans);
  } catch {
    renderAuth();
  }
}

init();
