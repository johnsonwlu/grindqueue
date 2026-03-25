const DEFAULT_API_URL = "https://api.grindqueue.com";

async function getBaseUrl() {
  const { apiUrl } = await chrome.storage.local.get("apiUrl");
  return apiUrl || DEFAULT_API_URL;
}

async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return token || null;
}

async function request(method, path, body) {
  const baseUrl = await getBaseUrl();
  const token = await getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  async login(email, password) {
    const baseUrl = await getBaseUrl();
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    await chrome.storage.local.set({ token: data.access_token });
    return data;
  },

  async register(email, password) {
    return request("POST", "/auth/register", { email, password });
  },

  async logout() {
    await chrome.storage.local.remove("token");
  },

  async isLoggedIn() {
    const token = await getToken();
    return !!token;
  },

  getPlans: () => request("GET", "/plans/"),
  createPlan: (name, description, sessions) =>
    request("POST", "/plans/", { name, description, sessions }),
  updatePlan: (id, data) => request("PUT", `/plans/${id}`, data),
  deletePlan: (id) => request("DELETE", `/plans/${id}`),

  addSession: (planId, session) =>
    request("POST", `/plans/${planId}/sessions`, session),
  updateSession: (planId, sessionId, data) =>
    request("PUT", `/plans/${planId}/sessions/${sessionId}`, data),
  deleteSession: (planId, sessionId) =>
    request("DELETE", `/plans/${planId}/sessions/${sessionId}`),
  reorderSessions: (planId, sessionIds) =>
    request("PUT", `/plans/${planId}/sessions/reorder`, { session_ids: sessionIds }),

  startRun: (planId, lockMode = false) =>
    request("POST", "/runs/", { plan_id: planId, lock_mode: lockMode }),
  getActiveRun: () => request("GET", "/runs/active"),
  advanceRun: (runId) => request("POST", `/runs/${runId}/advance`),
  pauseRun: (runId) => request("POST", `/runs/${runId}/pause`),
  resumeRun: (runId) => request("POST", `/runs/${runId}/resume`),
  abandonRun: (runId) => request("POST", `/runs/${runId}/abandon`),
};
