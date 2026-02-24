const API_DEFAULT_HEADERS = {
  "ngrok-skip-browser-warning": "true",
  Accept: "application/json",
  "Content-Type": "application/json"
};

function parseJsonPayload(rawText) {
  if (!rawText) {
    return null;
  }
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function buildNonJsonErrorMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return "Сервис вернул пустой ответ вместо JSON.";
  }
  if (text.startsWith("<!DOCTYPE html") || text.startsWith("<html")) {
    return "Сервис вернул HTML вместо JSON. Проверьте ngrok-домен и PUBLIC_BASE_URL.";
  }
  return "Сервис вернул ответ не в формате JSON.";
}

export async function apiRequest(path, options = {}) {
  const redirectOnUnauthorized = options.redirectOnUnauthorized !== false;
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...API_DEFAULT_HEADERS,
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 401) {
    if (redirectOnUnauthorized) {
      window.location.replace("/login");
    }
    return null;
  }

  if (response.status === 204) {
    return null;
  }

  const rawText = await response.text().catch(() => "");
  const payload = parseJsonPayload(rawText);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? payload.error || "Запрос не выполнен"
        : buildNonJsonErrorMessage(rawText);
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    error.raw = rawText;
    throw error;
  }

  if (!payload || typeof payload !== "object") {
    const error = new Error(buildNonJsonErrorMessage(rawText));
    error.status = response.status;
    error.payload = null;
    error.raw = rawText;
    throw error;
  }

  return payload;
}
