import { apiRequest } from "../shared/api.js?v=2";
import { renderAppHeader } from "../shared/app-header.js";
import { requireSession } from "../shared/session.js";

const appHeaderRoot = document.getElementById("app-header-root");
const backEditorButton = document.getElementById("live-back-editor");
const startButton = document.getElementById("live-start-button");
const sseStatusNode = document.getElementById("live-sse-status");
const tvUrlNode = document.getElementById("live-tv-url");
const guestUrlNode = document.getElementById("live-guest-url");
const snapshotNode = document.getElementById("live-snapshot");
const onAirNode = document.getElementById("live-on-air");
const onAirStatsNode = document.getElementById("live-on-air-stats");
const blocksNode = document.getElementById("live-blocks");
const quizPrevButton = document.getElementById("quiz-prev");
const quizNextButton = document.getElementById("quiz-next");
const quizIndexNode = document.getElementById("quiz-index");
const errorNode = document.getElementById("live-error");

let currentSessionId = null;
let eventSource = null;
let startInFlight = false;
let controlInFlight = false;
let currentSnapshot = null;
let currentLinks = null;
let currentOnAirStats = null;

function parsePresentationId() {
  const parts = window.location.pathname.split("/");
  const id = Number(parts[2]);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function showError(message) {
  errorNode.hidden = false;
  errorNode.textContent = message;
}

function clearError() {
  errorNode.hidden = true;
  errorNode.textContent = "";
}

function setSseStatus(label) {
  sseStatusNode.textContent = `SSE: ${label}`;
}

function setLink(node, value) {
  const url = String(value || "").trim();
  if (!url) {
    node.href = "#";
    node.textContent = "—";
    return;
  }
  node.href = url;
  node.textContent = url;
}

function renderLinks(links) {
  currentLinks = links || null;
  setLink(tvUrlNode, links?.tvUrl || "");
  setLink(guestUrlNode, links?.guestUrl || "");
}

function resolveOnAirBlock(snapshot) {
  const onAirId = Number(snapshot?.session?.settings?.onAirSessionBlockId) || null;
  if (!onAirId) {
    return null;
  }
  const blocks = Array.isArray(snapshot?.blocks) ? snapshot.blocks : [];
  return blocks.find((block) => Number(block.id) === onAirId) || null;
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

function renderSnapshot(snapshot) {
  snapshotNode.textContent = JSON.stringify(snapshot, null, 2);

  const onAirBlock = resolveOnAirBlock(snapshot);
  const onAirView = {
    onAirSessionBlockId: snapshot?.session?.settings?.onAirSessionBlockId || null,
    block: onAirBlock,
    quiz: {
      currentQuestionIndex: Number(snapshot?.session?.settings?.quiz?.currentQuestionIndex) || 0
    }
  };
  onAirNode.textContent = JSON.stringify(onAirView, null, 2);
  onAirStatsNode.textContent = currentOnAirStats
    ? JSON.stringify(currentOnAirStats, null, 2)
    : "Ожидание статистики...";
}

function renderBlocks(snapshot) {
  blocksNode.innerHTML = "";

  const blocks = Array.isArray(snapshot?.blocks) ? snapshot.blocks : [];
  const onAirId = Number(snapshot?.session?.settings?.onAirSessionBlockId) || null;

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "btn btn-secondary";
  clearButton.textContent = "Снять с эфира";
  clearButton.disabled = controlInFlight || !onAirId;
  clearButton.addEventListener("click", () => {
    setOnAirBlock(null);
  });
  blocksNode.appendChild(clearButton);

  if (!blocks.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "В сессии нет блоков.";
    blocksNode.appendChild(empty);
    return;
  }

  for (const block of blocks) {
    const row = document.createElement("div");
    row.className = "live-block-row";
    if (Number(block.id) === onAirId) {
      row.classList.add("is-on-air");
    }

    const label = document.createElement("div");
    label.className = "live-block-label";
    label.textContent = `${block.title || "Без названия"} (${block.type || "unknown"})`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary";
    button.textContent = Number(block.id) === onAirId ? "On Air" : "Поставить On Air";
    button.disabled = controlInFlight || Number(block.id) === onAirId;
    button.addEventListener("click", () => {
      setOnAirBlock(block.id);
    });

    row.appendChild(label);
    row.appendChild(button);
    blocksNode.appendChild(row);
  }
}

function renderQuizControls(snapshot) {
  const onAirBlock = resolveOnAirBlock(snapshot);
  const isQuizOnAir = onAirBlock?.type === "quiz";
  const questions = isQuizOnAir ? resolveQuizQuestions(onAirBlock) : [];
  const currentQuestionIndex = Number(snapshot?.session?.settings?.quiz?.currentQuestionIndex) || 0;

  quizPrevButton.disabled = !isQuizOnAir || controlInFlight;
  quizNextButton.disabled = !isQuizOnAir || controlInFlight;

  if (!isQuizOnAir) {
    quizIndexNode.textContent = "Вопрос: —";
    return;
  }

  const total = questions.length;
  if (!total) {
    quizIndexNode.textContent = "Вопрос: 0/0";
    return;
  }

  const safeIndex = Math.min(total - 1, Math.max(0, currentQuestionIndex));
  const activeQuestion = questions[safeIndex];
  const previewText = String(activeQuestion?.text || activeQuestion?.questionText || "").trim();
  quizIndexNode.textContent = `Вопрос: ${safeIndex + 1}/${total}${previewText ? ` — ${previewText}` : ""}`;
}

function renderAll(snapshot) {
  currentSnapshot = snapshot;
  renderSnapshot(snapshot);
  renderBlocks(snapshot);
  renderQuizControls(snapshot);
  if (snapshot?.links) {
    renderLinks(snapshot.links);
  } else if (currentLinks) {
    renderLinks(currentLinks);
  }
}

function applyOnAirStatsPayload(payload) {
  currentOnAirStats = payload || null;
  if (currentSnapshot) {
    renderSnapshot(currentSnapshot);
    renderQuizControls(currentSnapshot);
  }
}

function disconnectStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  setSseStatus("Отключено");
}

function connectStream(liveSessionId) {
  disconnectStream();
  setSseStatus("Подключение...");

  eventSource = new EventSource(`/api/live/sessions/${liveSessionId}/stream`, {
    withCredentials: true
  });

  eventSource.onopen = () => {
    setSseStatus("Подключено");
  };

  eventSource.addEventListener("live.session.snapshot", (event) => {
    try {
      const payload = JSON.parse(event.data);
      renderAll(payload);
      setSseStatus("Подключено");
    } catch {
      setSseStatus("Отключено");
      showError("Не удалось разобрать snapshot live-сессии.");
    }
  });

  eventSource.addEventListener("live.block.changed", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (!currentSnapshot) {
        return;
      }
      currentOnAirStats = null;
      currentSnapshot.session = currentSnapshot.session || {};
      currentSnapshot.session.settings = currentSnapshot.session.settings || {};
      currentSnapshot.session.settings.onAirSessionBlockId = payload?.onAirSessionBlockId || null;
      const currentIndex = Number(payload?.quiz?.currentQuestionIndex);
      if (!Number.isNaN(currentIndex)) {
        currentSnapshot.session.settings.quiz = {
          ...(currentSnapshot.session.settings.quiz || {}),
          currentQuestionIndex: currentIndex
        };
      }
      renderAll(currentSnapshot);
    } catch {
      showError("Не удалось обновить On Air состояние.");
    }
  });

  eventSource.addEventListener("live.quiz.question.changed", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (!currentSnapshot) {
        return;
      }
      currentOnAirStats = null;
      currentSnapshot.session = currentSnapshot.session || {};
      currentSnapshot.session.settings = currentSnapshot.session.settings || {};
      currentSnapshot.session.settings.quiz = {
        ...(currentSnapshot.session.settings.quiz || {}),
        currentQuestionIndex: Number(payload?.currentQuestionIndex) || 0
      };
      renderAll(currentSnapshot);
    } catch {
      showError("Не удалось обновить индекс вопроса викторины.");
    }
  });

  eventSource.addEventListener("live.onair.stats", (event) => {
    try {
      const payload = JSON.parse(event.data);
      applyOnAirStatsPayload(payload);
    } catch {
      showError("Не удалось обновить агрегаты on-air.");
    }
  });

  eventSource.onerror = () => {
    setSseStatus("Отключено");
  };
}

async function setOnAirBlock(sessionBlockId) {
  if (!currentSessionId || controlInFlight) {
    return;
  }

  controlInFlight = true;
  clearError();
  renderAll(currentSnapshot || {});

  try {
    await apiRequest(`/api/live/sessions/${currentSessionId}/on-air`, {
      method: "POST",
      body: JSON.stringify({ sessionBlockId })
    });
  } catch (error) {
    showError(error.message || "Не удалось переключить блок On Air.");
  } finally {
    controlInFlight = false;
    renderAll(currentSnapshot || {});
  }
}

async function changeQuizQuestion(action) {
  if (!currentSessionId || controlInFlight) {
    return;
  }

  controlInFlight = true;
  clearError();
  renderAll(currentSnapshot || {});

  try {
    await apiRequest(`/api/live/sessions/${currentSessionId}/quiz/question`, {
      method: "POST",
      body: JSON.stringify({ action })
    });
  } catch (error) {
    showError(error.message || "Не удалось переключить вопрос викторины.");
  } finally {
    controlInFlight = false;
    renderAll(currentSnapshot || {});
  }
}

async function startLiveSession(presentationId) {
  if (startInFlight) {
    return;
  }

  startInFlight = true;
  startButton.disabled = true;
  clearError();

  try {
    const payload = await apiRequest(`/api/presentations/${presentationId}/live/start`, {
      method: "POST"
    });

    const liveSessionId = Number(payload?.liveSessionId);
    if (!Number.isInteger(liveSessionId) || liveSessionId <= 0) {
      throw new Error("Сервис вернул некорректный идентификатор live-сессии.");
    }

    currentSessionId = liveSessionId;
    renderLinks(payload?.links || {});
    connectStream(liveSessionId);
  } catch (error) {
    showError(error.message || "Не удалось стартовать live-сессию.");
  } finally {
    startInFlight = false;
    startButton.disabled = false;
  }
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.replace("/login");
  }
}

async function bootstrap() {
  const presentationId = parsePresentationId();
  if (!presentationId) {
    throw new Error("Некорректный идентификатор презентации.");
  }

  const user = await requireSession();
  renderAppHeader({
    mountNode: appHeaderRoot,
    user,
    onLogout: logout
  });

  backEditorButton.addEventListener("click", () => {
    window.location.href = `/presentations/${presentationId}/editor`;
  });
  startButton.addEventListener("click", () => {
    startLiveSession(presentationId);
  });
  quizPrevButton.addEventListener("click", () => {
    changeQuizQuestion("prev");
  });
  quizNextButton.addEventListener("click", () => {
    changeQuizQuestion("next");
  });

  setSseStatus("Отключено");
  renderLinks({});
  renderAll({
    session: {
      settings: {
        onAirSessionBlockId: null,
        quiz: {
          currentQuestionIndex: 0
        }
      }
    },
    blocks: []
  });
  onAirStatsNode.textContent = "Ожидание статистики...";

  await startLiveSession(presentationId);
}

window.addEventListener("beforeunload", () => {
  disconnectStream();
});

bootstrap().catch((error) => showError(error.message || "Ошибка инициализации live."));
