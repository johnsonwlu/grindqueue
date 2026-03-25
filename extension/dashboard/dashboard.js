import { api } from "../api.js";

const app = document.getElementById("app");

// Segment colors for timeline
const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSessions(plan) {
  return [...(plan.sessions || [])].sort((a, b) => a.order - b.order);
}

function totalMins(plan) {
  return plan.sessions.reduce((s, x) => s + x.duration_minutes, 0);
}

// --- Layout shell ---

function renderLayout(activeNav, contentHtml, userEmail = "") {
  app.innerHTML = `
    <div class="layout">
      <div class="sidebar">
        <div class="sidebar-logo">GrindQueue</div>
        <a class="nav-item ${activeNav === "plans" ? "active" : ""}" data-nav="plans">Plans</a>
        <a class="nav-item ${activeNav === "timeline" ? "active" : ""}" data-nav="timeline">Timeline</a>
        <a class="nav-item ${activeNav === "settings" ? "active" : ""}" data-nav="settings">Settings</a>
        <div class="sidebar-bottom">
          <div class="user-email">${esc(userEmail)}</div>
          <button class="btn btn-ghost btn-sm" id="logout-btn" style="width:100%">Sign out</button>
        </div>
      </div>
      <div class="main">${contentHtml}</div>
    </div>
  `;

  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await api.logout();
    renderAuth();
  });
}

// --- Navigation ---

async function navigate(page) {
  if (page === "plans") await showPlans();
  else if (page === "timeline") await showTimeline();
  else if (page === "settings") await showSettings();
}

// --- Auth ---

function renderAuth(isRegister = false) {
  app.innerHTML = `
    <div class="auth-wrap">
      <h1>GrindQueue</h1>
      <h2 id="auth-title" style="font-size:15px;margin-bottom:16px">${isRegister ? "Create account" : "Sign in"}</h2>
      <div class="form-group">
        <label>Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input id="password" type="password" placeholder="••••••••" />
      </div>
      <div id="auth-error" class="error-msg"></div>
      <button class="btn btn-primary" id="auth-submit" style="width:100%;margin-top:12px">
        ${isRegister ? "Create account" : "Sign in"}
      </button>
      <div style="margin-top:12px;text-align:center">
        <button class="link-btn" id="auth-toggle">
          ${isRegister ? "Have an account? Sign in" : "No account? Register"}
        </button>
      </div>
    </div>
  `;

  document.getElementById("auth-toggle").addEventListener("click", () => {
    renderAuth(!isRegister);
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

// --- Plans list ---

async function showPlans() {
  renderLayout("plans", `<div class="spinner">Loading…</div>`);
  let plans;
  try {
    plans = await api.getPlans();
  } catch {
    renderAuth();
    return;
  }

  const { apiUrl } = await chrome.storage.local.get("apiUrl");
  const email = ""; // Could fetch /me if we add that endpoint

  const cardsHtml = plans.length === 0
    ? `<div class="empty-state">No plans yet. Create your first one.</div>`
    : plans.map((p) => {
        const sessions = getSessions(p);
        return `
          <div class="plan-card" data-plan-id="${p.id}">
            <div class="plan-card-name">${esc(p.name)}</div>
            <div class="plan-card-desc">${esc(p.description || "")}</div>
            <div class="plan-card-meta">
              <span>${sessions.length} session${sessions.length !== 1 ? "s" : ""}</span>
              <span>${totalMins(p)} min total</span>
            </div>
            <div class="plan-card-footer">
              <button class="btn btn-ghost btn-sm edit-plan-btn" data-id="${p.id}">Edit</button>
              <button class="btn btn-danger btn-sm delete-plan-btn" data-id="${p.id}">Delete</button>
            </div>
          </div>
        `;
      }).join("");

  renderLayout("plans", `
    <div class="page-header">
      <div class="page-title">Plans</div>
      <button class="btn btn-primary" id="new-plan-btn">+ New Plan</button>
    </div>
    <div class="plans-grid">${cardsHtml}</div>
  `, email);

  document.getElementById("new-plan-btn").addEventListener("click", () => showPlanEditor(null));

  document.querySelectorAll(".edit-plan-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showPlanEditor(plans.find((p) => p.id === parseInt(btn.dataset.id)));
    });
  });

  document.querySelectorAll(".delete-plan-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this plan?")) return;
      await api.deletePlan(parseInt(btn.dataset.id));
      showPlans();
    });
  });
}

// --- Plan editor ---

async function showPlanEditor(plan) {
  const isNew = !plan;
  let sessions = plan ? getSessions(plan) : [];
  let editingSessionId = null;

  function render() {
    const sessionsHtml = sessions.length === 0
      ? `<div class="empty-state" style="padding:16px 0">No sessions yet.</div>`
      : sessions.map((s, i) => `
          <div class="session-row" data-sid="${s.id ?? "new-" + i}">
            <div class="session-order">${i + 1}</div>
            <div class="session-info">
              <div class="session-name">${esc(s.label || "Untitled")}</div>
              <div class="session-meta">${s.duration_minutes} min · ${esc(s.url)}</div>
            </div>
            <div class="session-actions">
              ${i > 0 ? `<button class="btn btn-ghost btn-sm move-up-btn" data-idx="${i}" title="Move up">↑</button>` : ""}
              ${i < sessions.length - 1 ? `<button class="btn btn-ghost btn-sm move-down-btn" data-idx="${i}" title="Move down">↓</button>` : ""}
              <button class="btn btn-ghost btn-sm edit-session-btn" data-idx="${i}">Edit</button>
              <button class="btn btn-danger btn-sm remove-session-btn" data-idx="${i}">✕</button>
            </div>
          </div>
        `).join("");

    const editorHtml = `
      <div class="plan-editor">
        <button class="back-link" id="back-btn">← Back to Plans</button>
        <div class="page-header">
          <div class="page-title">${isNew ? "New Plan" : "Edit Plan"}</div>
          <button class="btn btn-primary" id="save-plan-btn">Save</button>
        </div>
        <div class="editor-fields">
          <input id="plan-name" placeholder="Plan name" value="${esc(plan?.name || "")}" />
          <textarea id="plan-desc" placeholder="Description (optional)">${esc(plan?.description || "")}</textarea>
        </div>
        <div class="section-header">
          <span class="section-title">Sessions</span>
          <button class="btn btn-ghost btn-sm" id="add-session-btn">+ Add Session</button>
        </div>
        <div class="session-list" id="session-list">${sessionsHtml}</div>
        ${editingSessionId !== null ? renderSessionForm(editingSessionId, sessions) : ""}
      </div>
    `;

    renderLayout("plans", editorHtml);
    bindEditorEvents();
  }

  function renderSessionForm(idx, sessions) {
    const s = idx === "new" ? { label: "", url: "", duration_minutes: 25 } : sessions[idx];
    return `
      <div class="session-form" id="session-form">
        <div class="session-form-grid">
          <input id="sf-label" placeholder="Label (e.g. React docs)" value="${esc(s.label || "")}" />
          <input id="sf-duration" type="number" min="1" placeholder="Minutes" value="${s.duration_minutes || ""}" />
          <input id="sf-url" class="url-input" placeholder="https://..." value="${esc(s.url || "")}" />
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost btn-sm" id="sf-cancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="sf-save">Save Session</button>
        </div>
      </div>
    `;
  }

  function bindEditorEvents() {
    document.getElementById("back-btn")?.addEventListener("click", showPlans);
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      await api.logout(); renderAuth();
    });
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.nav));
    });

    document.getElementById("save-plan-btn")?.addEventListener("click", async () => {
      const name = document.getElementById("plan-name").value.trim();
      const description = document.getElementById("plan-desc").value.trim();
      if (!name) { alert("Plan name is required."); return; }

      try {
        if (isNew) {
          const created = await api.createPlan(name, description, sessions.map((s, i) => ({
            url: s.url, label: s.label, duration_minutes: s.duration_minutes, order: i,
          })));
          plan = created;
          sessions = getSessions(created);
        } else {
          await api.updatePlan(plan.id, { name, description });
          // sync session orders
          const ids = sessions.filter((s) => s.id).map((s) => s.id);
          if (ids.length > 0) await api.reorderSessions(plan.id, ids);
        }
        showPlans();
      } catch (err) {
        alert(err.message);
      }
    });

    document.getElementById("add-session-btn")?.addEventListener("click", () => {
      editingSessionId = "new";
      render();
    });

    document.querySelectorAll(".edit-session-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingSessionId = parseInt(btn.dataset.idx);
        render();
      });
    });

    document.querySelectorAll(".remove-session-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.idx);
        const s = sessions[idx];
        if (s.id && plan?.id) {
          await api.deleteSession(plan.id, s.id);
        }
        sessions.splice(idx, 1);
        render();
      });
    });

    document.querySelectorAll(".move-up-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.idx);
        [sessions[idx - 1], sessions[idx]] = [sessions[idx], sessions[idx - 1]];
        render();
      });
    });

    document.querySelectorAll(".move-down-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.idx);
        [sessions[idx], sessions[idx + 1]] = [sessions[idx + 1], sessions[idx]];
        render();
      });
    });

    document.getElementById("sf-cancel")?.addEventListener("click", () => {
      editingSessionId = null;
      render();
    });

    document.getElementById("sf-save")?.addEventListener("click", async () => {
      const label = document.getElementById("sf-label").value.trim();
      const url = document.getElementById("sf-url").value.trim();
      const duration_minutes = parseInt(document.getElementById("sf-duration").value);

      if (!url) { alert("URL is required."); return; }
      if (!duration_minutes || duration_minutes < 1) { alert("Duration must be at least 1 minute."); return; }

      const sessionData = { label, url, duration_minutes, order: sessions.length };

      if (editingSessionId === "new") {
        if (plan?.id) {
          const created = await api.addSession(plan.id, sessionData);
          sessions.push(created);
        } else {
          sessions.push({ ...sessionData, id: null });
        }
      } else {
        const s = sessions[editingSessionId];
        if (s.id && plan?.id) {
          const updated = await api.updateSession(plan.id, s.id, sessionData);
          sessions[editingSessionId] = updated;
        } else {
          sessions[editingSessionId] = { ...s, ...sessionData };
        }
      }

      editingSessionId = null;
      render();
    });
  }

  render();
}

// --- Timeline ---

async function showTimeline() {
  renderLayout("timeline", `<div class="spinner">Loading…</div>`);
  let plans;
  try {
    plans = await api.getPlans();
  } catch {
    renderAuth();
    return;
  }

  // Try to get active run for highlighting
  let activeRun = null;
  try {
    const { run } = await chrome.runtime.sendMessage({ type: "GET_RUN" });
    activeRun = run;
  } catch (_) {}

  function renderTimeline(planId) {
    const plan = plans.find((p) => p.id === parseInt(planId));
    if (!plan || plan.sessions.length === 0) {
      return `<div class="empty-state">This plan has no sessions.</div>`;
    }

    const sessions = getSessions(plan);
    const total = totalMins(plan);
    const isActivePlan = activeRun?.plan_id === plan.id;

    const segments = sessions.map((s, i) => {
      const pct = (s.duration_minutes / total) * 100;
      const color = COLORS[i % COLORS.length];
      let cls = "timeline-segment";
      if (isActivePlan && i < activeRun.current_session_index) cls += " done";
      if (isActivePlan && i === activeRun.current_session_index) cls += " active";
      const tipText = `${s.label || "Untitled"} · ${s.duration_minutes} min`;
      return `
        <div class="${cls}" style="width:${pct}%;background:${color}" data-tip="${esc(tipText)}">
          ${pct > 6 ? `<span>${esc(s.label || "")}</span>` : ""}
        </div>
      `;
    }).join("");

    const labels = sessions.map((s, i) => {
      const pct = (s.duration_minutes / total) * 100;
      return `<div class="timeline-label" style="width:${pct}%">${s.duration_minutes}m</div>`;
    }).join("");

    return `
      <div class="timeline-bar">${segments}</div>
      <div class="timeline-labels">${labels}</div>
      <div class="timeline-total">${sessions.length} sessions · ${total} min total</div>
    `;
  }

  const options = plans.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const defaultPlan = activeRun
    ? plans.find((p) => p.id === activeRun.plan_id)
    : plans[0];

  renderLayout("timeline", `
    <div class="page-header">
      <div class="page-title">Timeline</div>
    </div>
    <div class="timeline-wrap">
      <div class="timeline-plan-select">
        <select id="plan-select">
          ${options}
        </select>
      </div>
      <div id="timeline-content">
        ${plans.length === 0
          ? `<div class="empty-state">No plans yet.</div>`
          : renderTimeline(defaultPlan?.id || plans[0].id)
        }
      </div>
    </div>
  `);

  if (defaultPlan) {
    document.getElementById("plan-select").value = defaultPlan.id;
  }

  document.getElementById("plan-select")?.addEventListener("change", (e) => {
    document.getElementById("timeline-content").innerHTML = renderTimeline(e.target.value);
  });
}

// --- Settings ---

async function showSettings() {
  const { apiUrl } = await chrome.storage.local.get("apiUrl");

  renderLayout("settings", `
    <div class="page-header">
      <div class="page-title">Settings</div>
    </div>
    <div class="settings-section">
      <div class="settings-group">
        <h3>API</h3>
        <div class="form-group">
          <label>Backend URL</label>
          <input id="api-url" placeholder="https://api.grindqueue.com" value="${esc(apiUrl || "")}" />
        </div>
        <button class="btn btn-primary btn-sm" id="save-api-url" style="margin-top:8px">Save</button>
        <div id="settings-msg" style="font-size:12px;margin-top:8px;color:var(--success)"></div>
      </div>
    </div>
  `);

  document.getElementById("save-api-url")?.addEventListener("click", async () => {
    const val = document.getElementById("api-url").value.trim();
    await chrome.storage.local.set({ apiUrl: val || null });
    document.getElementById("settings-msg").textContent = "Saved.";
    setTimeout(() => {
      const el = document.getElementById("settings-msg");
      if (el) el.textContent = "";
    }, 2000);
  });
}

// --- Init ---

async function init() {
  const loggedIn = await api.isLoggedIn();
  if (!loggedIn) {
    renderAuth();
    return;
  }
  showPlans();
}

init();
