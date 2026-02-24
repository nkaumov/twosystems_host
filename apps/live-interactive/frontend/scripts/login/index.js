import { apiRequest } from "../shared/api.js?v=2";

const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");
const submitButton = document.getElementById("login-submit");

async function bootstrap() {
  try {
    const payload = await apiRequest("/api/auth/me", { redirectOnUnauthorized: false });
    if (payload?.user) {
      window.location.replace("/presentations");
      return;
    }
  } catch (error) {
    // no-op: stay on login page
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  submitButton.disabled = true;

  const formData = new FormData(form);
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    const payload = await apiRequest("/api/auth/login", {
      method: "POST",
      redirectOnUnauthorized: false,
      body: JSON.stringify({
        login,
        email: login,
        password
      })
    });

    if (!payload?.user) {
      showError("Неверный логин или пароль");
      return;
    }
    window.location.replace("/presentations");
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

bootstrap();
