const previewSurfaceMap = {
  tv: { width: 1920, height: 1080 },
  guest: { width: 1080, height: 2340 }
};

function computePreviewScale(containerNode, surfaceType) {
  const surface = previewSurfaceMap[surfaceType] || previewSurfaceMap.tv;
  const width = containerNode.clientWidth || surface.width;
  const height = containerNode.clientHeight || surface.height;
  const scale = Math.min(width / surface.width, height / surface.height);
  return Math.max(scale, 0.06);
}

function getPositionStyle(position, paddingPx) {
  const [verticalRaw, horizontalRaw] = String(position || "").split("-");
  const vertical = verticalRaw || "center";
  const horizontal = horizontalRaw || "center";

  const style = {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)"
  };

  if (vertical === "top") {
    style.top = `${paddingPx}px`;
    style.transform = horizontal === "center" ? "translateX(-50%)" : "none";
  } else if (vertical === "bottom") {
    style.top = "auto";
    style.bottom = `${paddingPx}px`;
    style.transform = horizontal === "center" ? "translateX(-50%)" : "none";
  }

  if (horizontal === "left") {
    style.left = `${paddingPx}px`;
    style.right = "auto";
    if (vertical === "center") {
      style.transform = "translateY(-50%)";
    }
  } else if (horizontal === "right") {
    style.left = "auto";
    style.right = `${paddingPx}px`;
    if (vertical === "center") {
      style.transform = "translateY(-50%)";
    }
  }

  return style;
}

function buildBackgroundValue(appearanceSettings) {
  const type = appearanceSettings?.backgroundType || "solid";
  const color1 = appearanceSettings?.backgroundColor || "#ffffff";
  const color2 = appearanceSettings?.gradientColor || "#d7ede1";
  const image = appearanceSettings?.backgroundMedia?.src || "";

  if (type === "linear") {
    return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  }
  if (type === "radial") {
    return `radial-gradient(circle at center, ${color2} 0%, ${color1} 72%)`;
  }
  if (type === "image" && image) {
    return `center / cover no-repeat url("${image}")`;
  }
  return color1;
}

function buildQrImageSrc(value) {
  const payload = String(value || "").trim();
  if (!payload) {
    return "";
  }
  return `/api/qr?size=512&data=${encodeURIComponent(payload)}`;
}

function buildExternalQrImageSrc(value) {
  const payload = String(value || "").trim();
  if (!payload) {
    return "";
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(payload)}`;
}

function appendQrContent(node, qrValue) {
  const qrSrc = buildQrImageSrc(qrValue);
  if (!qrSrc) {
    const icon = document.createElement("span");
    icon.className = "material-icons";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "qr_code";
    node.appendChild(icon);
    return;
  }

  const image = document.createElement("img");
  image.alt = "QR-code";
  image.loading = "lazy";
  image.src = qrSrc;
  image.dataset.fallbackStep = "0";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  image.style.borderRadius = "8px";
  image.addEventListener("error", () => {
    const step = Number(image.dataset.fallbackStep || "0");
    if (step === 0) {
      image.dataset.fallbackStep = "1";
      image.src = buildExternalQrImageSrc(qrValue);
      return;
    }
    image.remove();
    const icon = document.createElement("span");
    icon.className = "material-icons";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "qr_code";
    node.appendChild(icon);
  });
  node.appendChild(image);
}

function renderGuestWaitScreen(containerNode) {
  const wait = document.createElement("div");
  wait.className = "guest-wait-screen";
  const waitText = document.createElement("p");
  waitText.textContent = "Дождитесь когда администратор включит следующий слайд.";
  wait.appendChild(waitText);
  containerNode.appendChild(wait);
}

function createQuizHeader(viewport, text, scale) {
  const header = document.createElement("p");
  header.className = "quiz-preview-meta";
  header.textContent = text;
  header.style.fontSize = `${Math.max(10, Math.round(26 * scale))}px`;
  viewport.appendChild(header);
}

function renderConnectionPageTv(viewport, additionalSettings, scale, runtimeSettings = {}, isLiveRender = false) {
  const connectionScreen = document.createElement("section");
  connectionScreen.className = "quiz-connect-screen";

  const title = document.createElement("h4");
  title.className = "quiz-preview-question";
  title.textContent = "Подключение к викторине";
  title.style.fontSize = `${Math.max(14, Math.round(42 * scale))}px`;
  connectionScreen.appendChild(title);

  const qr = document.createElement("div");
  qr.className = "quiz-connect-qr";
  const qrSize = Math.max(12, Math.min(82, Number(additionalSettings?.connectionPage?.qrSize || 36)));
  qr.style.width = `${qrSize}%`;
  appendQrContent(qr, runtimeSettings?.guestJoinUrl || "");
  connectionScreen.appendChild(qr);

  const hint = document.createElement("p");
  hint.className = "quiz-connect-hint";
  hint.textContent = "Сканируйте QR-code для подключения к сессии.";
  connectionScreen.appendChild(hint);

  const counter = document.createElement("p");
  counter.className = "quiz-connect-counter";
  counter.textContent = isLiveRender
    ? `Подключено: ${Number(runtimeSettings?.connectedGuestsCount || 0)}`
    : "Подключено: N";
  connectionScreen.appendChild(counter);

  viewport.appendChild(connectionScreen);
}

function renderConnectionPageGuest(viewport, scale) {
  const guestIntro = document.createElement("section");
  guestIntro.className = "quiz-connect-screen";

  const title = document.createElement("h4");
  title.className = "quiz-preview-question";
  title.textContent = "Скоро начнется викторина";
  title.style.fontSize = `${Math.max(14, Math.round(40 * scale))}px`;
  guestIntro.appendChild(title);

  const hint = document.createElement("p");
  hint.className = "quiz-connect-hint";
  hint.textContent = "Ожидайте старт и появление первого вопроса.";
  guestIntro.appendChild(hint);

  viewport.appendChild(guestIntro);
}

function getQuestionOptionText(question, index) {
  const options = Array.isArray(question?.options) ? question.options : [];
  return String(options[index] || "").trim() || `Вариант ${index + 1}`;
}

function renderSingleChoiceOptions(card, question, surfaceType, isInteractive) {
  const list = document.createElement("ul");
  list.className = "quiz-preview-options";
  if (surfaceType === "guest" && isInteractive) {
    list.classList.add("quiz-preview-options-guest");
  }

  for (let index = 0; index < 4; index += 1) {
    const option = document.createElement("li");
    option.className = "quiz-preview-option";
    if (surfaceType === "guest" && isInteractive) {
      option.classList.add("guest-answer-option");
      option.dataset.optionIndex = String(index);
      option.setAttribute("role", "button");
      option.setAttribute("tabindex", "0");
    }

    const optionLabel = document.createElement("span");
    optionLabel.className = "quiz-preview-option-index";
    optionLabel.textContent = String.fromCharCode(65 + index);

    const optionText = document.createElement("span");
    optionText.className = "quiz-preview-option-text";
    optionText.textContent = getQuestionOptionText(question, index);

    option.appendChild(optionLabel);
    option.appendChild(optionText);
    list.appendChild(option);
  }

  card.appendChild(list);
}

function normalizeChoicePercents(raw) {
  if (!Array.isArray(raw) || raw.length !== 4) {
    return null;
  }
  return raw.map((value) => Math.max(0, Math.min(100, Number(value) || 0)));
}

function normalizeChoiceVotes(raw) {
  if (!Array.isArray(raw) || raw.length !== 4) {
    return null;
  }
  return raw.map((value) => Math.max(0, Math.round(Number(value) || 0)));
}

function renderTvChoiceChart(card, question, options = {}) {
  const isLiveRender = Boolean(options.isLiveRender);
  const runtimePercents = normalizeChoicePercents(options.choicePercents);
  const percents = runtimePercents || (isLiveRender ? [0, 0, 0, 0] : [36, 24, 28, 12]);

  const chart = document.createElement("section");
  chart.className = "quiz-tv-chart";

  if (!isLiveRender) {
    const demoLabel = document.createElement("p");
    demoLabel.className = "quiz-tv-chart-note";
    demoLabel.textContent = "Демо-данные предпросмотра (в live будут реальные ответы гостей)";
    chart.appendChild(demoLabel);
  }

  for (let index = 0; index < 4; index += 1) {
    const row = document.createElement("div");
    row.className = "quiz-tv-chart-row";

    const label = document.createElement("div");
    label.className = "quiz-tv-chart-label";
    label.textContent = `${String.fromCharCode(65 + index)}. ${getQuestionOptionText(question, index)}`;
    row.appendChild(label);

    const bar = document.createElement("div");
    bar.className = "quiz-tv-chart-bar";
    const fill = document.createElement("span");
    fill.className = "quiz-tv-chart-fill";
    fill.style.width = `${percents[index]}%`;
    bar.appendChild(fill);
    row.appendChild(bar);

    const value = document.createElement("div");
    value.className = "quiz-tv-chart-value";
    value.textContent = `${Math.round(percents[index])}%`;
    row.appendChild(value);

    chart.appendChild(row);
  }

  if (isLiveRender && percents.every((value) => value === 0)) {
    const empty = document.createElement("p");
    empty.className = "quiz-tv-chart-note";
    empty.textContent = "Ждем ответы гостей...";
    chart.appendChild(empty);
  }

  card.appendChild(chart);
}

function renderTvChoicePie(card, question, options = {}) {
  const isLiveRender = Boolean(options.isLiveRender);
  const runtimeVotes = normalizeChoiceVotes(options.choiceVotes);
  const votes = runtimeVotes || (isLiveRender ? [0, 0, 0, 0] : [37, 52, 18, 33]);

  const totalVotes = votes.reduce((sum, value) => sum + value, 0);
  const percents = totalVotes > 0 ? votes.map((value) => Math.round((value / totalVotes) * 100)) : [0, 0, 0, 0];
  const chartPercents = totalVotes > 0 ? percents : [25, 25, 25, 25];
  const colors = ["#6b2bd9", "#168dcf", "#17a96d", "#e12c87"];

  const wrapper = document.createElement("section");
  wrapper.className = "quiz-tv-pie";

  const topPanel = document.createElement("div");
  topPanel.className = "quiz-tv-pie-top";

  const pie = document.createElement("div");
  pie.className = "quiz-tv-pie-chart";
  const pPink = chartPercents[3];
  const pPurple = pPink + chartPercents[0];
  const pBlue = pPurple + chartPercents[1];
  pie.style.background = `conic-gradient(
    ${colors[3]} 0% ${pPink}%,
    ${colors[0]} ${pPink}% ${pPurple}%,
    ${colors[1]} ${pPurple}% ${pBlue}%,
    ${colors[2]} ${pBlue}% 100%
  )`;

  const center = document.createElement("div");
  center.className = "quiz-tv-pie-center";
  const total = document.createElement("strong");
  total.className = "quiz-tv-pie-total";
  total.textContent = String(totalVotes);
  const totalLabel = document.createElement("span");
  totalLabel.className = "quiz-tv-pie-total-label";
  totalLabel.textContent = "голосов";
  center.appendChild(total);
  center.appendChild(totalLabel);
  pie.appendChild(center);
  topPanel.appendChild(pie);
  wrapper.appendChild(topPanel);

  const votesList = document.createElement("ul");
  votesList.className = "quiz-tv-votes-list";
  for (let index = 0; index < 4; index += 1) {
    const voteItem = document.createElement("li");
    voteItem.className = "quiz-tv-votes-item";

    const head = document.createElement("div");
    head.className = "quiz-tv-votes-head";

    const left = document.createElement("span");
    left.className = "quiz-tv-votes-label";
    const dot = document.createElement("span");
    dot.className = "quiz-tv-votes-dot";
    dot.style.background = colors[index];
    left.appendChild(dot);
    const shortLabel = document.createElement("span");
    shortLabel.textContent = `${index + 1} · ${String.fromCharCode(65 + index)}`;
    left.appendChild(shortLabel);
    head.appendChild(left);

    const right = document.createElement("span");
    right.className = "quiz-tv-votes-values";
    const count = document.createElement("strong");
    count.className = "quiz-tv-votes-count";
    count.textContent = String(votes[index]);
    const percent = document.createElement("span");
    percent.className = "quiz-tv-votes-percent";
    percent.textContent = `${percents[index]}%`;
    right.appendChild(count);
    right.appendChild(percent);
    head.appendChild(right);
    voteItem.appendChild(head);

    const track = document.createElement("div");
    track.className = "quiz-tv-votes-track";
    const fill = document.createElement("span");
    fill.className = "quiz-tv-votes-fill";
    fill.style.width = `${percents[index]}%`;
    fill.style.setProperty("--vote-color", colors[index]);
    track.appendChild(fill);
    voteItem.appendChild(track);

    votesList.appendChild(voteItem);
  }
  wrapper.appendChild(votesList);

  if (isLiveRender && totalVotes === 0) {
    const empty = document.createElement("p");
    empty.className = "quiz-tv-chart-note";
    empty.textContent = "Ждем ответы гостей...";
    wrapper.appendChild(empty);
  }

  card.appendChild(wrapper);
}

function getSampleTextAnswers() {
  return [
    ["Пупсик", "Вика", "#6b2bd9"],
    ["Рыжик", "Саша", "#168dcf"],
    ["Капитан", "Дима", "#17a96d"],
    ["Малыш", "Аня", "#e12c87"],
    ["Шустрик", "Илья", "#168dcf"],
    ["Федя", "Оля", "#6b2bd9"],
    ["Кузя", "Кирилл", "#17a96d"],
    ["Смайл", "Лена", "#168dcf"],
    ["Зайка", "Рома", "#e12c87"],
    ["Торнадо", "Марина", "#6b2bd9"],
    ["Босс", "Женя", "#17a96d"],
    ["Комарик", "Катя", "#168dcf"],
    ["Патрон", "Артем", "#e12c87"],
    ["Профессор", "Таня", "#6b2bd9"],
    ["Солнышко", "Миша", "#17a96d"],
    ["Чемпион", "Инна", "#168dcf"],
    ["Котенок", "Паша", "#e12c87"],
    ["Пельмень", "Наташа", "#6b2bd9"],
    ["Лис", "Егор", "#17a96d"],
    ["Супермен", "Юля", "#168dcf"],
    ["Пирожок", "Игорь", "#e12c87"],
    ["Гром", "Алиса", "#6b2bd9"],
    ["Ниндзя", "Стас", "#17a96d"]
  ];
}

function normalizeRuntimeTextAnswers(runtimeAnswers) {
  if (!Array.isArray(runtimeAnswers)) {
    return [];
  }
  return runtimeAnswers
    .map((item) => {
      if (Array.isArray(item)) {
        return [String(item[0] || "").trim(), String(item[1] || "").trim(), String(item[2] || "#168dcf")];
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      const answer = String(item.answer || item.text || "").trim();
      const guest = String(item.guest || item.author || "").trim();
      const color = String(item.color || "#168dcf").trim() || "#168dcf";
      return [answer, guest, color];
    })
    .filter((item) => item && item[0]);
}

function renderTvTextCloud(card, options = {}) {
  const isLiveRender = Boolean(options.isLiveRender);
  const runtimeAnswers = normalizeRuntimeTextAnswers(options.runtimeTextAnswers);
  const answers = isLiveRender ? runtimeAnswers : getSampleTextAnswers();

  const cloud = document.createElement("section");
  cloud.className = "quiz-tv-cloud";

  const surface = document.createElement("div");
  surface.className = "quiz-tv-cloud-surface";
  const list = document.createElement("div");
  list.className = "quiz-tv-cloud-list";

  if (!answers.length) {
    const empty = document.createElement("p");
    empty.className = "quiz-tv-chart-note";
    empty.textContent = "Ответы появятся после первых участников.";
    surface.appendChild(empty);
    cloud.appendChild(surface);
    card.appendChild(cloud);
    return;
  }

  for (const [answer, guest, color] of answers) {
    const chip = document.createElement("div");
    chip.className = "quiz-tv-cloud-chip";
    chip.style.setProperty("--cloud-color", color);

    const dot = document.createElement("span");
    dot.className = "quiz-tv-cloud-dot";
    chip.appendChild(dot);

    const answerNode = document.createElement("strong");
    answerNode.className = "quiz-tv-cloud-answer";
    answerNode.textContent = answer;
    chip.appendChild(answerNode);

    const sep = document.createElement("span");
    sep.className = "quiz-tv-cloud-sep";
    sep.textContent = "•";
    chip.appendChild(sep);

    const author = document.createElement("span");
    author.className = "quiz-tv-cloud-author";
    author.textContent = guest;
    chip.appendChild(author);

    list.appendChild(chip);
  }

  surface.appendChild(list);
  cloud.appendChild(surface);
  card.appendChild(cloud);
}

function renderTvTextPile(card, options = {}) {
  const isLiveRender = Boolean(options.isLiveRender);
  const runtimeAnswers = normalizeRuntimeTextAnswers(options.runtimeTextAnswers);
  const sampleAnswers = isLiveRender ? runtimeAnswers : getSampleTextAnswers();

  const pile = document.createElement("section");
  pile.className = "quiz-tv-pile";

  const surface = document.createElement("div");
  surface.className = "quiz-tv-pile-surface";

  if (!sampleAnswers.length) {
    const empty = document.createElement("p");
    empty.className = "quiz-tv-chart-note";
    empty.textContent = "Ответы появятся после первых участников.";
    surface.appendChild(empty);
    pile.appendChild(surface);
    card.appendChild(pile);
    return;
  }

  const rows = [1, 2, 3, 4, 4, 4, 3, 2];
  const yStep = 10.5;
  const baseY = 2;
  let index = 0;

  for (let rowIndex = 0; rowIndex < rows.length && index < sampleAnswers.length; rowIndex += 1) {
    const count = rows[rowIndex];
    const spacing = count <= 2 ? 26 : count === 3 ? 20 : 16.5;
    const y = baseY + rowIndex * yStep;
    for (let col = 0; col < count && index < sampleAnswers.length; col += 1) {
      const [answer, guest, color] = sampleAnswers[index];
      const chip = document.createElement("div");
      chip.className = "quiz-tv-cloud-chip quiz-tv-pile-chip";
      chip.style.setProperty("--cloud-color", color);

      const x = 50 + (col - (count - 1) / 2) * spacing + ((index % 3) - 1) * 1.2;
      const rotation = ((index % 5) - 2) * 1.5;
      chip.style.left = `${Math.max(10, Math.min(90, x))}%`;
      chip.style.top = `${Math.max(0, Math.min(92, y + (index % 2 ? 1.2 : 0)))}%`;
      chip.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
      chip.style.zIndex = String(100 - rowIndex);

      const dot = document.createElement("span");
      dot.className = "quiz-tv-cloud-dot";
      chip.appendChild(dot);

      const answerNode = document.createElement("strong");
      answerNode.className = "quiz-tv-cloud-answer";
      answerNode.textContent = answer;
      chip.appendChild(answerNode);

      const sep = document.createElement("span");
      sep.className = "quiz-tv-cloud-sep";
      sep.textContent = "•";
      chip.appendChild(sep);

      const author = document.createElement("span");
      author.className = "quiz-tv-cloud-author";
      author.textContent = guest;
      chip.appendChild(author);

      surface.appendChild(chip);
      index += 1;
    }
  }

  pile.appendChild(surface);
  card.appendChild(pile);
}

function renderQuizContent(viewport, question, scale, surfaceType, settings = {}) {
  const card = document.createElement("section");
  card.className = "quiz-preview-card";

  const mainSettings = settings.mainSettings || {};
  const appearanceSettings = settings.appearanceSettings || {};
  const runtimeSettings = settings.runtimeSettings || {};
  const isLiveRender = Boolean(settings.isLiveRender);
  const isInteractive = mainSettings.displayTarget === "tv_and_guest";
  const choiceAnswersView = String(appearanceSettings.choiceAnswersView || "chart");
  const textAnswersView = String(appearanceSettings.textAnswersView || "cloud");

  const title = document.createElement("h4");
  title.className = "quiz-preview-question";
  title.textContent = String(question?.questionText || "").trim() || "Введите текст вопроса в редакторе.";
  title.style.fontSize = `${Math.max(13, Math.round(42 * scale))}px`;
  card.appendChild(title);

  if (question?.type === "TEXT") {
    if (surfaceType === "tv" && isInteractive && textAnswersView === "cloud") {
      renderTvTextCloud(card, {
        isLiveRender,
        runtimeTextAnswers: runtimeSettings.textAnswers
      });
      viewport.appendChild(card);
      return;
    }

    if (surfaceType === "tv" && isInteractive && textAnswersView === "pile") {
      renderTvTextPile(card, {
        isLiveRender,
        runtimeTextAnswers: runtimeSettings.textAnswers
      });
      viewport.appendChild(card);
      return;
    }

    const input = document.createElement("input");
    input.className = "quiz-preview-text-input";
    input.type = "text";
    input.placeholder = "Введите ответ";
    const guestInteractiveText = surfaceType === "guest" && isInteractive;
    input.disabled = !guestInteractiveText;
    if (guestInteractiveText) {
      input.dataset.guestTextAnswer = "1";
    }
    card.appendChild(input);

    if (guestInteractiveText) {
      const actions = document.createElement("div");
      actions.className = "quiz-guest-text-actions";
      const submitButton = document.createElement("button");
      submitButton.type = "button";
      submitButton.className = "btn btn-primary";
      submitButton.dataset.guestTextSubmit = "1";
      submitButton.textContent = "Отправить";
      actions.appendChild(submitButton);
      card.appendChild(actions);
    }

    if (surfaceType === "tv") {
      const hint = document.createElement("p");
      hint.className = "quiz-preview-meta";
      hint.textContent = "Гости отправляют текстовый ответ.";
      card.appendChild(hint);
    }
  } else {
    if (surfaceType === "tv" && isInteractive) {
      if (choiceAnswersView === "pie") {
        renderTvChoicePie(card, question, {
          isLiveRender,
          choiceVotes: runtimeSettings.choiceVotes,
          choicePercents: runtimeSettings.choicePercents
        });
      } else {
        renderTvChoiceChart(card, question, {
          isLiveRender,
          choicePercents: runtimeSettings.choicePercents
        });
      }
    } else {
      renderSingleChoiceOptions(card, question, surfaceType, isInteractive);
    }
  }

  viewport.appendChild(card);
}

function renderQuizQr(viewport, additionalSettings, paddingPx, runtimeSettings = {}, isLiveRender = false) {
  if (!additionalSettings?.showQr) {
    return;
  }

  const qrNode = document.createElement("div");
  qrNode.className = "flex-preview-qr";
  const qrSize = Math.max(8, Math.min(60, Number(additionalSettings?.qrSize || 22)));
  qrNode.style.width = `${qrSize}%`;
  qrNode.style.zIndex = "25";

  const qrPosition = getPositionStyle(additionalSettings?.qrPosition, paddingPx);
  qrNode.style.top = qrPosition.top;
  qrNode.style.left = qrPosition.left;
  qrNode.style.right = qrPosition.right;
  qrNode.style.bottom = qrPosition.bottom;
  qrNode.style.transform = qrPosition.transform;

  appendQrContent(qrNode, isLiveRender ? runtimeSettings?.guestJoinUrl || "" : "");
  viewport.appendChild(qrNode);
}

export function renderQuizPreview(containerNode, selectedBlock, surfaceType, options = {}) {
  containerNode.innerHTML = "";

  const contentSettings = selectedBlock.settings?.content || {};
  const appearanceSettings = selectedBlock.settings?.appearance || {};
  const additionalSettings = selectedBlock.settings?.additional || {};
  const runtimeSettings =
    additionalSettings.__live && typeof additionalSettings.__live === "object"
      ? additionalSettings.__live
      : {};
  const isLiveRender = options.mode === "live" || options.isLive === true || Boolean(runtimeSettings.isLive);
  const mainSettings = selectedBlock.settings?.main || {};
  const quiz = contentSettings.quiz || null;
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const hasConnectionPage = Boolean(additionalSettings?.connectionPage?.enabled);
  const slidesCount = questions.length + (hasConnectionPage ? 1 : 0);

  const viewport = document.createElement("div");
  viewport.className = `quiz-preview-viewport quiz-preview-viewport-${surfaceType}`;
  if (isLiveRender) {
    viewport.classList.add("quiz-preview-live");
  }
  viewport.style.background = buildBackgroundValue(appearanceSettings);
  containerNode.appendChild(viewport);

  if (!slidesCount) {
    const empty = document.createElement("p");
    empty.className = "preview-empty";
    empty.textContent = "Создайте викторину и добавьте вопросы, чтобы увидеть предпросмотр.";
    viewport.appendChild(empty);
    return;
  }

  const safeSlideIndex = Math.max(0, Math.min(slidesCount - 1, Number(contentSettings.previewQuestionIndex || 0)));
  const scale = computePreviewScale(containerNode, surfaceType);

  if (surfaceType === "guest" && mainSettings.displayTarget === "tv_only") {
    if (hasConnectionPage && safeSlideIndex === 0) {
      if (!isLiveRender) {
        createQuizHeader(viewport, "Страница подключения", scale);
      }
      renderConnectionPageGuest(viewport, scale);
      return;
    }
    renderGuestWaitScreen(containerNode);
    return;
  }

  if (hasConnectionPage && safeSlideIndex === 0) {
    if (!isLiveRender) {
      createQuizHeader(viewport, "Страница подключения", scale);
    }
    if (surfaceType === "tv") {
      renderConnectionPageTv(viewport, additionalSettings, scale, runtimeSettings, isLiveRender);
    } else {
      renderConnectionPageGuest(viewport, scale);
    }
    return;
  }

  const questionIndex = hasConnectionPage ? safeSlideIndex - 1 : safeSlideIndex;
  const question = questions[questionIndex];
  const quizTitle = String(quiz?.title || "").trim();
  const titlePrefix = quizTitle ? `${quizTitle} | ` : "";
  if (!isLiveRender) {
    createQuizHeader(viewport, `${titlePrefix}Вопрос ${questionIndex + 1} из ${questions.length}`, scale);
  }

  renderQuizContent(viewport, question, scale, surfaceType, {
    mainSettings,
    appearanceSettings,
    runtimeSettings,
    isLiveRender
  });

  if (surfaceType === "tv") {
    const paddingPx = Math.max(8, Math.round(72 * scale));
    renderQuizQr(viewport, additionalSettings, paddingPx, runtimeSettings, isLiveRender);
  }
}

