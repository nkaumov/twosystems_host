import { apiRequest } from "../shared/api.js?v=2";

const statusNode = document.getElementById("screen-status");
const errorNode = document.getElementById("screen-error");
const mainNode = document.getElementById("screen-main");
const joinSection = document.getElementById("guest-join");
const joinInput = document.getElementById("guest-name-input");
const joinButton = document.getElementById("guest-join-button");
const joinStatusNode = document.getElementById("guest-join-status");
const interactiveSection = document.getElementById("guest-interactive");
const interactiveContentNode = document.getElementById("guest-interactive-content");
const actionStatusNode = document.getElementById("guest-action-status");

const DEVICE_KEY_STORAGE = "live.deviceKey";

let token = null;
let eventSource = null;
let state = null;
let joinInFlight = false;
let actionInFlight = false;
let deviceKey = null;
let joinedGuest = null;
let currentOnAirStats = null;

function guestNameStorageKey(sessionToken) {
  return `live.guestName.${sessionToken}`;
}

function parseToken() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length ? String(parts[parts.length - 1]).trim() : null;
}

function getOrCreateDeviceKey() {
  const existing = String(localStorage.getItem(DEVICE_KEY_STORAGE) || "").trim();
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(DEVICE_KEY_STORAGE, generated);
  return generated;
}

function setStatus(text) {
  statusNode.textContent = text;
}

function showError(message) {
  errorNode.hidden = false;
  errorNode.textContent = message;
}

function clearError() {
  errorNode.hidden = true;
  errorNode.textContent = "";
}

function setJoinStatus(text) {
  joinStatusNode.textContent = text;
}

function setActionStatus(text) {
  actionStatusNode.textContent = text;
}

function resolveQuizQuestions(block) {
  const nested = block?.content?.content?.quiz?.questions;
  if (Array.isArray(nested)) {
    return nested;
  }
  const fallback = block?.content?.quiz?.questions;
  if (Array.isArray(fallback)) {
    return fallback;
  }
  return [];
}

function resolveQuestionKind(question) {
  const rawKind = String(question?.kind || question?.type || "").trim().toLowerCase();
  if (rawKind === "text") {
    return "text";
  }
  if (rawKind === "choice" || rawKind === "single_choice") {
    return "choice";
  }
  return "choice";
}

function resolveQuestionText(question) {
  return String(question?.text || question?.questionText || "").trim();
}

function resolveQuestionOptions(question) {
  if (Array.isArray(question?.choices)) {
    return question.choices.map((item) => String(item || "").trim());
  }
  if (Array.isArray(question?.options)) {
    return question.options.map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        return String(item.text || item.label || "").trim();
      }
      return "";
    });
  }
  return [];
}

function resolvePollOptions(block) {
  const optionsFromConfig = block?.config?.options;
  if (Array.isArray(optionsFromConfig)) {
    return optionsFromConfig.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const optionsFromContent = block?.content?.content?.poll?.options || block?.content?.poll?.options;
  if (Array.isArray(optionsFromContent)) {
    return optionsFromContent
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (item && typeof item === "object") {
          return String(item.text || item.label || "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  return [];
}

function clearMain() {
  mainNode.innerHTML = "";
}

function appendMainText(tag, text, className = "") {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  node.textContent = text;
  mainNode.appendChild(node);
  return node;
}

function renderMain() {
  clearMain();

  if (!joinedGuest) {
    appendMainText("h2", "Подключение гостя");
    appendMainText("p", "Введите имя выше, чтобы присоединиться к эфиру.", "muted");
    return;
  }

  appendMainText("h2", `Вы подключены как ${joinedGuest.displayName || "Гость"}`);

  const onAirBlock = state?.onAir?.block || null;
  if (!onAirBlock) {
    appendMainText("p", "Ожидайте, пока администратор включит следующий блок.", "muted");
    return;
  }

  appendMainText("p", `Сейчас в эфире: ${onAirBlock.title || "Блок"} (${onAirBlock.type || "unknown"})`);

  if (onAirBlock.type === "quiz") {
    const questions = resolveQuizQuestions(onAirBlock);
    const currentQuestionIndex = Number(state?.session?.settings?.quiz?.currentQuestionIndex) || 0;
    const safeIndex = Math.max(0, Math.min(questions.length - 1, currentQuestionIndex));
    const question = questions[safeIndex];
    if (question) {
      appendMainText("p", `Вопрос ${safeIndex + 1}: ${resolveQuestionText(question) || "Без текста"}`, "muted");
    }
  }

  if (currentOnAirStats?.stats?.totalVotes !== undefined) {
    appendMainText("p", `Ответов в эфире: ${currentOnAirStats.stats.totalVotes}`, "muted");
  }
}

function renderJoinState() {
  const isJoined = Boolean(joinedGuest?.id);
  joinSection.hidden = isJoined;
  interactiveSection.hidden = !isJoined;
  if (isJoined) {
    setJoinStatus(`Подключено как: ${joinedGuest.displayName || "Гость"}`);
  }
}

async function submitAction(actionPayload) {
  if (actionInFlight || !token || !deviceKey) {
    return;
  }

  actionInFlight = true;
  setActionStatus("Отправка ответа...");

  try {
    await apiRequest(`/api/live/links/${encodeURIComponent(token)}/guest/action`, {
      method: "POST",
      body: JSON.stringify({
        deviceKey,
        action: actionPayload
      }),
      redirectOnUnauthorized: false
    });
    setActionStatus("Ответ принят");
  } catch (error) {
    setActionStatus("Ошибка отправки ответа");
    showError(error.message || "Не удалось отправить ответ.");
  } finally {
    actionInFlight = false;
  }
}

function renderQuizInteractive(block) {
  const questions = resolveQuizQuestions(block);
  const currentQuestionIndex = Number(state?.session?.settings?.quiz?.currentQuestionIndex) || 0;
  const safeIndex = Math.max(0, Math.min(questions.length - 1, currentQuestionIndex));
  const question = questions[safeIndex];

  if (!question) {
    interactiveContentNode.innerHTML = "<p class=\"muted\">Вопрос викторины недоступен.</p>";
    return;
  }

  const questionText = resolveQuestionText(question);
  const questionKind = resolveQuestionKind(question);

  interactiveContentNode.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = questionText || `Вопрос ${safeIndex + 1}`;
  interactiveContentNode.appendChild(title);

  if (questionKind === "text") {
    const row = document.createElement("div");
    row.className = "guest-text-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "input";
    input.placeholder = "Введите ответ";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary";
    button.textContent = "Отправить";
    button.disabled = actionInFlight;
    button.addEventListener("click", () => {
      const text = String(input.value || "").trim();
      if (!text) {
        setActionStatus("Введите текст ответа.");
        return;
      }
      submitAction({
        type: "quiz.answer",
        sessionBlockId: block.id,
        questionIndex: safeIndex,
        mode: "text",
        text
      });
    });

    row.appendChild(input);
    row.appendChild(button);
    interactiveContentNode.appendChild(row);
    return;
  }

  const options = resolveQuestionOptions(question).slice(0, 4);
  const optionsWrap = document.createElement("div");
  optionsWrap.className = "guest-options";

  options.forEach((optionLabel, optionIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary guest-option-btn";
    button.textContent = `${optionIndex + 1}. ${optionLabel || `Вариант ${optionIndex + 1}`}`;
    button.disabled = actionInFlight;
    button.addEventListener("click", () => {
      submitAction({
        type: "quiz.answer",
        sessionBlockId: block.id,
        questionIndex: safeIndex,
        mode: "choice",
        optionIndex
      });
    });
    optionsWrap.appendChild(button);
  });

  if (!options.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Для вопроса не заданы варианты ответа.";
    optionsWrap.appendChild(empty);
  }

  interactiveContentNode.appendChild(optionsWrap);
}

function renderPollInteractive(block) {
  const options = resolvePollOptions(block);
  interactiveContentNode.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = block.title || "Голосование";
  interactiveContentNode.appendChild(title);

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "guest-options";

  options.forEach((optionLabel, optionIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary guest-option-btn";
    button.textContent = `${optionIndex + 1}. ${optionLabel}`;
    button.disabled = actionInFlight;
    button.addEventListener("click", () => {
      submitAction({
        type: "poll.vote",
        sessionBlockId: block.id,
        optionIndex
      });
    });
    optionsWrap.appendChild(button);
  });

  if (!options.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Варианты голосования не заданы.";
    optionsWrap.appendChild(empty);
  }

  interactiveContentNode.appendChild(optionsWrap);
}

function renderInteractive() {
  if (!joinedGuest) {
    interactiveContentNode.innerHTML = "<p class=\"muted\">Сначала подключитесь как гость.</p>";
    return;
  }

  const onAirBlock = state?.onAir?.block || null;
  if (!onAirBlock) {
    interactiveContentNode.innerHTML =
      "<p class=\"muted\">Ожидайте, пока администратор включит интерактив.</p>";
    return;
  }

  if (onAirBlock.type === "quiz") {
    renderQuizInteractive(onAirBlock);
    return;
  }

  if (onAirBlock.type === "poll") {
    renderPollInteractive(onAirBlock);
    return;
  }

  interactiveContentNode.innerHTML =
    "<p class=\"muted\">Текущий блок не требует действий от гостя.</p>";
}

function renderAll() {
  renderJoinState();
  renderInteractive();
  renderMain();
}

function applySnapshot(snapshot) {
  state = snapshot;
  currentOnAirStats = null;
  renderAll();
}

function applyBlockChanged(payload) {
  state = state || {};
  state.session = state.session || {};
  state.session.settings = state.session.settings || {};
  state.session.settings.onAirSessionBlockId = payload?.onAirSessionBlockId || null;
  state.session.settings.quiz = {
    ...(state.session.settings.quiz || {}),
    currentQuestionIndex: Number(payload?.quiz?.currentQuestionIndex) || 0
  };
  state.onAir = {
    sessionBlockId: payload?.onAirSessionBlockId || null,
    block: payload?.block || null
  };
  currentOnAirStats = null;
  renderAll();
}

function applyQuizChanged(payload) {
  state = state || {};
  state.session = state.session || {};
  state.session.settings = state.session.settings || {};
  state.session.settings.quiz = {
    ...(state.session.settings.quiz || {}),
    currentQuestionIndex: Number(payload?.currentQuestionIndex) || 0
  };
  currentOnAirStats = null;
  renderAll();
}

function applyOnAirStats(payload) {
  currentOnAirStats = payload || null;
  renderMain();
}

function connectStream() {
  const streamUrl = `/api/live/links/${encodeURIComponent(token)}/stream`;
  eventSource = new EventSource(streamUrl);

  eventSource.onopen = () => {
    clearError();
    setStatus("Подключено");
  };

  eventSource.addEventListener("live.session.snapshot", (event) => {
    try {
      const payload = JSON.parse(event.data);
      applySnapshot(payload);
      setStatus("Подключено");
    } catch {
      setStatus("Ошибка");
      showError("Не удалось разобрать live.session.snapshot.");
    }
  });

  eventSource.addEventListener("live.block.changed", (event) => {
    try {
      const payload = JSON.parse(event.data);
      applyBlockChanged(payload);
    } catch {
      showError("Не удалось разобрать live.block.changed.");
    }
  });

  eventSource.addEventListener("live.quiz.question.changed", (event) => {
    try {
      const payload = JSON.parse(event.data);
      applyQuizChanged(payload);
    } catch {
      showError("Не удалось разобрать live.quiz.question.changed.");
    }
  });

  eventSource.addEventListener("live.onair.stats", (event) => {
    try {
      const payload = JSON.parse(event.data);
      applyOnAirStats(payload);
    } catch {
      showError("Не удалось разобрать live.onair.stats.");
    }
  });

  eventSource.onerror = () => {
    setStatus("Отключено");
  };
}

async function joinGuest(displayName) {
  if (joinInFlight || !token || !deviceKey) {
    return;
  }

  const normalizedName = String(displayName || "").trim().slice(0, 120);
  if (!normalizedName) {
    setJoinStatus("Введите имя для входа.");
    return;
  }

  joinInFlight = true;
  joinButton.disabled = true;
  setJoinStatus("Подключение...");

  try {
    const result = await apiRequest(`/api/live/links/${encodeURIComponent(token)}/guest/join`, {
      method: "POST",
      body: JSON.stringify({
        deviceKey,
        displayName: normalizedName
      }),
      redirectOnUnauthorized: false
    });

    joinedGuest = result?.guest || null;
    localStorage.setItem(guestNameStorageKey(token), normalizedName);
    setJoinStatus(`Подключено как ${joinedGuest?.displayName || normalizedName}`);
    setActionStatus("");
    renderAll();
  } catch (error) {
    setJoinStatus("Ошибка подключения");
    showError(error.message || "Не удалось подключиться как гость.");
  } finally {
    joinInFlight = false;
    joinButton.disabled = false;
  }
}

function bootstrapJoin() {
  const savedName = String(localStorage.getItem(guestNameStorageKey(token)) || "").trim();
  if (savedName) {
    joinInput.value = savedName;
    joinGuest(savedName);
  }

  joinButton.addEventListener("click", () => {
    joinGuest(joinInput.value);
  });

  joinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      joinGuest(joinInput.value);
    }
  });
}

function bootstrap() {
  token = parseToken();
  if (!token) {
    showError("Токен ссылки не найден.");
    setStatus("Ошибка");
    return;
  }

  deviceKey = getOrCreateDeviceKey();
  setStatus("Подключение...");
  renderAll();
  bootstrapJoin();
  connectStream();
}

window.addEventListener("beforeunload", () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
});

bootstrap();