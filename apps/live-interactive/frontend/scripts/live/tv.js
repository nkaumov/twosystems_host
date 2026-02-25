const statusNode = document.getElementById("screen-status");
const errorNode = document.getElementById("screen-error");
const mainNode = document.getElementById("screen-main");

let eventSource = null;
let state = null;
let onAirStats = null;

function parseToken() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length ? String(parts[parts.length - 1]).trim() : null;
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

function clearMain() {
  mainNode.innerHTML = "";
}

function appendText(tag, text, className = "") {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  node.textContent = text;
  mainNode.appendChild(node);
  return node;
}

function renderStatsList(stats) {
  if (!stats || typeof stats !== "object") {
    return;
  }

  const counts = stats.counts && typeof stats.counts === "object" ? stats.counts : {};
  const keys = Object.keys(counts).sort((a, b) => Number(a) - Number(b));
  if (keys.length) {
    appendText("h3", "Голоса", "live-screen-subtitle");
    const list = document.createElement("ul");
    list.className = "live-screen-list";
    for (const key of keys) {
      const item = document.createElement("li");
      item.textContent = `Вариант ${Number(key) + 1}: ${counts[key]}`;
      list.appendChild(item);
    }
    mainNode.appendChild(list);
  }

  const textAnswers = Array.isArray(stats.textAnswers) ? stats.textAnswers : [];
  if (textAnswers.length) {
    appendText("h3", "Текстовые ответы", "live-screen-subtitle");
    const list = document.createElement("ul");
    list.className = "live-screen-list";
    for (const answer of textAnswers) {
      const item = document.createElement("li");
      const name = String(answer?.displayName || "Гость").trim() || "Гость";
      const text = String(answer?.text || "").trim();
      item.textContent = `${name}: ${text}`;
      list.appendChild(item);
    }
    mainNode.appendChild(list);
  }

  const totalVotes = Number(stats.totalVotes);
  if (Number.isFinite(totalVotes) && totalVotes >= 0) {
    appendText("p", `Всего ответов: ${totalVotes}`, "muted");
  }
}

function renderNoOnAir() {
  clearMain();
  appendText("h2", "Ожидание эфира");
  appendText("p", "Администратор пока не вывел блок в эфир.", "muted");
}

function renderQuiz(onAirBlock) {
  const questions = resolveQuizQuestions(onAirBlock);
  const currentQuestionIndex = Number(state?.session?.settings?.quiz?.currentQuestionIndex) || 0;
  const safeIndex = Math.max(0, Math.min(questions.length - 1, currentQuestionIndex));
  const question = questions[safeIndex] || null;

  clearMain();
  appendText("h2", onAirBlock?.title ? `В эфире: ${onAirBlock.title}` : "В эфире: Викторина");

  if (!question) {
    appendText("p", "В викторине нет доступного вопроса.", "muted");
    return;
  }

  appendText("p", `Вопрос ${safeIndex + 1}`, "muted");
  appendText("p", resolveQuestionText(question) || "Без текста вопроса");

  const options = resolveQuestionOptions(question).filter(Boolean);
  if (options.length) {
    const list = document.createElement("ol");
    list.className = "live-screen-list";
    for (const option of options) {
      const item = document.createElement("li");
      item.textContent = option;
      list.appendChild(item);
    }
    mainNode.appendChild(list);
  }

  if (onAirStats?.blockType === "quiz") {
    renderStatsList(onAirStats.stats);
  }
}

function renderPoll(onAirBlock) {
  clearMain();
  appendText("h2", onAirBlock?.title ? `В эфире: ${onAirBlock.title}` : "В эфире: Голосование");
  appendText("p", "Голосование активно", "muted");

  if (onAirStats?.blockType === "poll") {
    renderStatsList(onAirStats.stats);
  }
}

function renderOther(onAirBlock) {
  clearMain();
  const title = onAirBlock?.title ? `В эфире: ${onAirBlock.title}` : "В эфире: блок";
  appendText("h2", title);
  appendText("p", `Тип блока: ${onAirBlock?.type || "unknown"}`, "muted");
}

function render() {
  const onAirBlock = state?.onAir?.block || null;

  if (!onAirBlock) {
    renderNoOnAir();
    return;
  }

  if (onAirBlock.type === "quiz") {
    renderQuiz(onAirBlock);
    return;
  }

  if (onAirBlock.type === "poll") {
    renderPoll(onAirBlock);
    return;
  }

  renderOther(onAirBlock);
}

function applySnapshot(snapshot) {
  state = snapshot;
  onAirStats = null;
  render();
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
  onAirStats = null;
  render();
}

function applyQuizChanged(payload) {
  state = state || {};
  state.session = state.session || {};
  state.session.settings = state.session.settings || {};
  state.session.settings.quiz = {
    ...(state.session.settings.quiz || {}),
    currentQuestionIndex: Number(payload?.currentQuestionIndex) || 0
  };
  onAirStats = null;
  render();
}

function applyOnAirStats(payload) {
  onAirStats = payload || null;
  render();
}

function connect(token) {
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

function bootstrap() {
  const token = parseToken();
  if (!token) {
    showError("Токен ссылки не найден.");
    setStatus("Ошибка");
    return;
  }

  setStatus("Подключение...");
  connect(token);
}

window.addEventListener("beforeunload", () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
});

bootstrap();