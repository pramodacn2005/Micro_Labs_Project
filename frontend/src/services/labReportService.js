function getApiBase() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
  }
  // Default to port 4000 to match backend default
  return "http://localhost:4000/api";
}

const API_BASE = getApiBase();

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.message || "Request failed");
    err.data = error;
    throw err;
  }
  return response.json();
}

export async function uploadLabReport(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/lab-report/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response);
}

export async function predictLabReport(payload) {
  const response = await fetch(`${API_BASE}/lab-report/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}


