// Ensure API base URL is correct - always include /api
// Default to port 3000 to match backend, but can be overridden via env vars
function getApiBase() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    // If env URL doesn't end with /api, add it
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
  }
  // Default to port 4000 (backend default from .env)
  return "http://localhost:4000/api";
}

const API_BASE = getApiBase();

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorObj = new Error(error.message || "Request failed");
    // Attach full error data for detailed error handling
    errorObj.data = error;
    throw errorObj;
  }
  return response.json();
}

export async function submitFeverCheck(payload) {
  const response = await fetch(`${API_BASE}/fever-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function sendAssistantMessage(sessionId, message) {
  const response = await fetch(`${API_BASE}/ai-assistant/${sessionId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  return handleResponse(response);
}

