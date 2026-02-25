import {
  createDefaultQuizDocument,
  createDefaultQuizQuestion
} from "../quiz-block.js";
import { applyPositionPickerState, clamp, getPositionIdByRatios } from "../positioning.js";
import { normalizeQuizContentV1, normalizeQuizQuestionV1 } from "../schemas/quiz.v1.js";
import {
  getSelectedBlock,
  updateSelectedBlock,
  updateSelectedBlockSetting
} from "../state.js";

const AIVO_QUIZ_FORMAT = "AIVO_QUIZ";
const AIVO_SOURCE = "AIVO";
const AIVO_SUPPORTED_VERSION = 1;
const AIVO_EXPORT_TOKEN = "AIVO_EXPORT_V1";

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function ensureQuizStructure(settings) {
  if (!settings.content || typeof settings.content !== "object" || Array.isArray(settings.content)) {
    settings.content = {};
  }
  if (!settings.content.quiz || typeof settings.content.quiz !== "object" || Array.isArray(settings.content.quiz)) {
    settings.content.quiz = createDefaultQuizDocument();
  }
  if (!Array.isArray(settings.content.quiz.questions)) {
    settings.content.quiz.questions = [];
  }
}

function normalizeImportedQuestionType(value) {
  return String(value || "").trim() === "TEXT" ? "TEXT" : "SINGLE_CHOICE";
}

function normalizeImportedOptions(rawQuestion) {
  const options = Array.isArray(rawQuestion?.options)
    ? rawQuestion.options.map((item) => String(item || ""))
    : [];

  if (options.length < 4) {
    const fallback = [
      rawQuestion?.option1,
      rawQuestion?.option2,
      rawQuestion?.option3,
      rawQuestion?.option4
    ];
    for (const value of fallback) {
      if (options.length >= 4) {
        break;
      }
      options.push(String(value || ""));
    }
  }

  while (options.length < 4) {
    options.push("");
  }
  return options.slice(0, 4);
}

function normalizeImportedQuestion(rawQuestion) {
  const type = normalizeImportedQuestionType(rawQuestion?.type);
  const rawCorrectIndex = Number(rawQuestion?.correctOptionIndex);
  const hasCorrectIndex = !Number.isNaN(rawCorrectIndex);

  return {
    type,
    questionText: String(rawQuestion?.questionText || rawQuestion?.text || rawQuestion?.question || ""),
    options: normalizeImportedOptions(rawQuestion),
    correctOptionIndex:
      type === "TEXT"
        ? null
        : hasCorrectIndex
          ? Math.max(0, Math.min(3, Math.round(rawCorrectIndex)))
          : 0,
    correctText: String(rawQuestion?.correctText || rawQuestion?.correctAnswer || rawQuestion?.answer || "")
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNestedBriefPayload(payload) {
  if (!isObject(payload) || !payload.briefJson) {
    return null;
  }
  if (isObject(payload.briefJson)) {
    return payload.briefJson;
  }
  if (typeof payload.briefJson === "string") {
    try {
      const parsed = JSON.parse(payload.briefJson);
      return isObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function isAivoContainerPayload(payload) {
  if (!isObject(payload)) {
    return false;
  }
  if (String(payload.format || "").trim() === AIVO_QUIZ_FORMAT) {
    return true;
  }
  const nestedBriefPayload = getNestedBriefPayload(payload);
  return String(nestedBriefPayload?.format || "").trim() === AIVO_QUIZ_FORMAT;
}

function buildQuizFromAivoContainer(payload) {
  const sourcePayload = isAivoContainerPayload(payload)
    ? String(payload?.format || "").trim() === AIVO_QUIZ_FORMAT
      ? payload
      : getNestedBriefPayload(payload)
    : null;

  if (!isObject(sourcePayload)) {
    throw new Error("Файл .aivo имеет неверную структуру.");
  }

  if (String(sourcePayload.format || "").trim() !== AIVO_QUIZ_FORMAT) {
    throw new Error("Неверный формат файла. Ожидается AIVO_QUIZ.");
  }

  if (String(sourcePayload.source || "").trim().toUpperCase() !== AIVO_SOURCE) {
    throw new Error("Файл не подтвержден как экспорт AIVO (source=AIVO).");
  }
  if (String(sourcePayload.token || "").trim() !== AIVO_EXPORT_TOKEN) {
    throw new Error("Файл не подтвержден как экспорт AIVO (token).");
  }

  const version = Number(sourcePayload.version);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("В файле .aivo отсутствует корректная версия формата.");
  }
  if (version !== AIVO_SUPPORTED_VERSION) {
    throw new Error(
      `Неподдерживаемая версия формата AIVO: ${version}. Поддерживается: ${AIVO_SUPPORTED_VERSION}.`
    );
  }

  const rawQuestions = sourcePayload?.quiz?.questions;
  if (!Array.isArray(rawQuestions) || !rawQuestions.length) {
    throw new Error("В файле AIVO не найден список вопросов.");
  }

  const questions = rawQuestions.map(normalizeImportedQuestion);
  const title = String(sourcePayload?.quiz?.title || sourcePayload?.title || "Импорт из AIVO");
  return {
    title: title.trim() || "Импорт из AIVO",
    questions
  };
}

function findQuestionsInPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.briefJson) {
    const briefPayload =
      typeof payload.briefJson === "string"
        ? (() => {
            try {
              return JSON.parse(payload.briefJson);
            } catch {
              return null;
            }
          })()
        : payload.briefJson;
    const nestedQuestions = findQuestionsInPayload(briefPayload);
    if (nestedQuestions) {
      return nestedQuestions;
    }
  }
  if (Array.isArray(payload.questions)) {
    return payload.questions;
  }
  if (Array.isArray(payload.quizQuestions)) {
    return payload.quizQuestions;
  }
  if (payload.answers && Array.isArray(payload.answers.quizQuestions)) {
    return payload.answers.quizQuestions;
  }
  if (payload.quiz && Array.isArray(payload.quiz.questions)) {
    return payload.quiz.questions;
  }
  return null;
}

function buildQuizFromImportedPayload(payload, { isAivoFile = false } = {}) {
  if (isAivoFile || isAivoContainerPayload(payload)) {
    return buildQuizFromAivoContainer(payload);
  }

  const rawQuestions = findQuestionsInPayload(payload);
  if (!rawQuestions || !rawQuestions.length) {
    throw new Error("В JSON не найдены вопросы викторины.");
  }

  const titleSource =
    payload?.briefJson && typeof payload.briefJson === "object"
      ? payload.briefJson
      : payload;
  const questions = rawQuestions.map(normalizeImportedQuestion);
  const title = String(
    titleSource?.title ||
      titleSource?.quizTitle ||
      titleSource?.name ||
      titleSource?.answers?.quizTitle ||
      "Импорт из AIVO"
  );

  return {
    title: title.trim() || "Импорт из AIVO",
    questions
  };
}

function parseJsonWithAutoFix(text, { isAivoFile = false } = {}) {
  const normalizedText = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!normalizedText) {
    throw new Error("Файл пустой.");
  }

  try {
    return JSON.parse(normalizedText);
  } catch (firstError) {
    if (!isAivoFile) {
      throw firstError;
    }

    const fixedTitleText = normalizedText.replace(
      /("title"\s*:\s*)([^"{\[\]\n\r][^,\n\r}]*)(\s*[,\r\n}])/,
      (match, prefix, rawValue, suffix) => {
        const cleanValue = String(rawValue || "").trim();
        if (!cleanValue || cleanValue.startsWith("\"")) {
          return match;
        }
        return `${prefix}${JSON.stringify(cleanValue)}${suffix}`;
      }
    );
    if (fixedTitleText === normalizedText) {
      throw firstError;
    }
    return JSON.parse(fixedTitleText);
  }
}

async function parseImportedFileJson(file) {
  const buffer = await file.arrayBuffer();
  const decoders = ["utf-8", "windows-1251", "utf-16le", "utf-16be"];
  let lastError = null;

  for (const encoding of decoders) {
    try {
      const text = new TextDecoder(encoding).decode(buffer);
      return parseJsonWithAutoFix(text, { isAivoFile: false });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Не удалось прочитать файл.");
}

function normalizeQuizOptionsForEditor(rawOptions) {
  const options = Array.isArray(rawOptions) ? rawOptions.map((item) => String(item || "").trim()) : [];
  while (options.length < 4) {
    options.push("");
  }
  return options.slice(0, 4);
}

function normalizeImportedQuestionForEditor(rawQuestion, index) {
  const normalizedQuestion = normalizeQuizQuestionV1(rawQuestion, index);
  const rawType = String(normalizedQuestion.kind || normalizedQuestion.type || "")
    .trim()
    .toLowerCase();
  const isTextQuestion = rawType === "text";
  const options = normalizeQuizOptionsForEditor(normalizedQuestion.options || normalizedQuestion.choices);
  const acceptedAnswers = Array.isArray(normalizedQuestion.acceptedAnswers)
    ? normalizedQuestion.acceptedAnswers.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const thresholdRaw = Number(normalizedQuestion?.scoring?.threshold);
  const threshold = Number.isFinite(thresholdRaw) ? Math.max(0, Math.min(1, thresholdRaw)) : 0.75;
  const normalizedCorrectIndex = Number(normalizedQuestion.correctOptionIndex ?? normalizedQuestion.correctIndex);
  const correctOptionIndex = isTextQuestion
    ? null
    : Number.isFinite(normalizedCorrectIndex)
      ? Math.max(0, Math.min(3, Math.round(normalizedCorrectIndex)))
      : 0;
  const correctText = acceptedAnswers[0] || String(normalizedQuestion.correctText || "").trim();

  return {
    type: isTextQuestion ? "TEXT" : "SINGLE_CHOICE",
    kind: isTextQuestion ? "text" : "choice",
    questionText: String(normalizedQuestion.questionText || "").trim(),
    options,
    choices: options,
    correctOptionIndex,
    correctIndex: correctOptionIndex,
    correctText,
    acceptedAnswers,
    scoring: {
      mode: "threshold",
      threshold
    }
  };
}

function extractQuizImportSource(payload) {
  if (Array.isArray(payload)) {
    return {
      title: "",
      questions: payload
    };
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Импорт невозможен: JSON должен быть объектом или массивом вопросов.");
  }
  if (payload?.settings?.content?.quiz && typeof payload.settings.content.quiz === "object") {
    return payload.settings.content.quiz;
  }
  if (payload?.content?.quiz && typeof payload.content.quiz === "object") {
    return payload.content.quiz;
  }
  if (payload?.quiz && typeof payload.quiz === "object") {
    return payload.quiz;
  }
  if (Array.isArray(payload?.questions)) {
    return payload;
  }
  if (Array.isArray(payload?.quizQuestions)) {
    return {
      title: String(payload.title || payload.quizTitle || "").trim(),
      questions: payload.quizQuestions
    };
  }
  throw new Error("Импорт невозможен: не найден массив вопросов (questions).");
}

function buildNormalizedQuizContentFromImport(payload) {
  const sourceQuiz = extractQuizImportSource(payload);
  const normalizedQuiz = normalizeQuizContentV1(sourceQuiz);
  if (!Array.isArray(normalizedQuiz.questions)) {
    throw new Error("Импорт невозможен: вопросы викторины должны быть массивом.");
  }

  const questions = normalizedQuiz.questions.map((question, index) =>
    normalizeImportedQuestionForEditor(question, index)
  );

  return {
    quiz: {
      title: String(normalizedQuiz.title || "").trim(),
      questions
    },
    previewQuestionIndex: 0
  };
}

export function createSettingsController({
  settingsContentNode,
  renderBlocks,
  renderPreview,
  renderAll,
  showError,
  clearError
}) {
  let activePositionDrag = null;

  function openQuizCreateModal() {
    const modal = document.querySelector("[data-quiz-create-modal='quiz-global']");
    if (!modal) {
      return;
    }
    modal.hidden = false;
    const titleInput = modal.querySelector("[data-quiz-create-title='1']");
    if (titleInput) {
      titleInput.value = "";
      window.setTimeout(() => {
        titleInput.focus();
      }, 0);
    }
  }

  function closeQuizCreateModal() {
    const modal = document.querySelector("[data-quiz-create-modal='quiz-global']");
    if (!modal) {
      return;
    }
    modal.hidden = true;
  }

  function openQuizEditorModal() {
    const modal = document.querySelector("[data-quiz-editor-modal='quiz-editor-global']");
    if (!modal) {
      return;
    }
    modal.hidden = false;
  }

  function closeQuizEditorModal() {
    const modal = document.querySelector("[data-quiz-editor-modal='quiz-editor-global']");
    if (!modal) {
      return;
    }
    modal.hidden = true;
  }

  function openQuizClearModal() {
    const modal = document.querySelector("[data-quiz-clear-modal='quiz-clear-global']");
    if (!modal) {
      return;
    }
    modal.hidden = false;
  }

  function closeQuizClearModal() {
    const modal = document.querySelector("[data-quiz-clear-modal='quiz-clear-global']");
    if (!modal) {
      return;
    }
    modal.hidden = true;
  }

  function syncBackgroundSectionUi() {
    const modeSelect = settingsContentNode.querySelector(
      "[data-setting-path='appearance.backgroundType']"
    );
    const secondaryRow = settingsContentNode.querySelector("[data-background-secondary='1']");
    const imageControls = settingsContentNode.querySelector("[data-background-image-controls='1']");
    if (!modeSelect || !secondaryRow) {
      return;
    }
    secondaryRow.hidden = modeSelect.value === "solid" || modeSelect.value === "image";
    if (imageControls) {
      imageControls.hidden = modeSelect.value !== "image";
    }
  }

  function syncToggleDependentSections() {
    const mediaEnabled = settingsContentNode.querySelector(
      "[data-setting-path='content.media.enabled']"
    );
    const mediaControls = settingsContentNode.querySelector("[data-media-controls='1']");
    if (mediaEnabled && mediaControls) {
      mediaControls.hidden = !mediaEnabled.checked;
    }

    const qrEnabled = settingsContentNode.querySelector(
      "[data-setting-path='additional.showQr']"
    );
    const qrControls = settingsContentNode.querySelector("[data-qr-controls='1']");
    if (qrEnabled && qrControls) {
      qrControls.hidden = !qrEnabled.checked;
    }

    const connectionEnabled = settingsContentNode.querySelector(
      "[data-setting-path='additional.connectionPage.enabled']"
    );
    const connectionControls = settingsContentNode.querySelector("[data-connection-page-controls='1']");
    if (connectionEnabled && connectionControls) {
      connectionControls.hidden = !connectionEnabled.checked;
    }

    const displayTargetSelect = settingsContentNode.querySelector(
      "[data-setting-path='main.displayTarget']"
    );
    const interactiveOnlyControls = settingsContentNode.querySelectorAll(
      "[data-interactive-only-controls='1']"
    );
    if (displayTargetSelect && interactiveOnlyControls.length) {
      const isInteractive = displayTargetSelect.value === "tv_and_guest";
      for (const node of interactiveOnlyControls) {
        node.hidden = !isInteractive;
      }
    }
  }

  function switchContentTab(tabId) {
    const targetId = tabId === "media" ? "media" : "text";
    const tabs = settingsContentNode.querySelectorAll("[data-content-tab-target]");
    const panels = settingsContentNode.querySelectorAll("[data-content-tab]");

    for (const tab of tabs) {
      tab.classList.toggle("active", tab.dataset.contentTabTarget === targetId);
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.contentTab !== targetId;
    }
  }

  function applySettingsUpdate(nextSettings, { rerenderAll = false, reopenEditorAfterRerender = false } = {}) {
    updateSelectedBlock({ settings: nextSettings });
    renderBlocks();
    renderPreview();
    if (rerenderAll) {
      renderAll();
      if (reopenEditorAfterRerender) {
        openQuizEditorModal();
      }
    }
  }

  function setQuizValue(nextQuiz, { rerenderAll = false, reopenEditorAfterRerender = false } = {}) {
    const selectedBlock = getSelectedBlock();
    if (!selectedBlock || selectedBlock.type !== "quiz") {
      return false;
    }

    const nextSettings = cloneDeep(selectedBlock.settings);
    if (!nextSettings.content || typeof nextSettings.content !== "object" || Array.isArray(nextSettings.content)) {
      nextSettings.content = {};
    }
    nextSettings.content.quiz = nextQuiz;
    applySettingsUpdate(nextSettings, { rerenderAll, reopenEditorAfterRerender });
    return true;
  }

  function setQuizContentValue(
    nextContent,
    { rerenderAll = false, reopenEditorAfterRerender = false } = {}
  ) {
    const selectedBlock = getSelectedBlock();
    if (!selectedBlock || selectedBlock.type !== "quiz") {
      return false;
    }

    const safeContent =
      nextContent && typeof nextContent === "object" && !Array.isArray(nextContent)
        ? nextContent
        : { quiz: null, previewQuestionIndex: 0 };

    const nextSettings = cloneDeep(selectedBlock.settings);
    nextSettings.content = safeContent;
    applySettingsUpdate(nextSettings, { rerenderAll, reopenEditorAfterRerender });
    return true;
  }

  function updateQuiz(mutator, { rerenderAll = false, reopenEditorAfterRerender = false } = {}) {
    const selectedBlock = getSelectedBlock();
    if (!selectedBlock || selectedBlock.type !== "quiz") {
      return false;
    }

    const nextSettings = cloneDeep(selectedBlock.settings);
    ensureQuizStructure(nextSettings);
    mutator(nextSettings.content.quiz);
    applySettingsUpdate(nextSettings, { rerenderAll, reopenEditorAfterRerender });
    return true;
  }

  function handleQuizFieldInput(event) {
    const field = event.target?.dataset?.quizField;
    if (!field) {
      return false;
    }

    const questionIndex = Number(event.target.dataset.index);
    if (Number.isNaN(questionIndex) || questionIndex < 0) {
      return false;
    }

    return updateQuiz((quiz) => {
      if (!Array.isArray(quiz.questions)) {
        quiz.questions = [];
      }
      const question = quiz.questions[questionIndex];
      if (!question) {
        return;
      }

      if (field === "type") {
        const nextType = event.target.value === "TEXT" ? "TEXT" : "SINGLE_CHOICE";
        question.type = nextType;
        if (!Array.isArray(question.options) || question.options.length !== 4) {
          question.options = ["", "", "", ""];
        }
        if (nextType === "TEXT") {
          question.correctOptionIndex = null;
        } else if (typeof question.correctOptionIndex !== "number") {
          question.correctOptionIndex = 0;
        }
        if (typeof question.correctText !== "string") {
          question.correctText = "";
        }
        return;
      }

      if (field === "questionText") {
        question.questionText = String(event.target.value || "");
        return;
      }

      if (field === "optionText") {
        const optionIndex = Number(event.target.dataset.optionIndex);
        if (Number.isNaN(optionIndex) || optionIndex < 0 || optionIndex > 3) {
          return;
        }
        if (!Array.isArray(question.options)) {
          question.options = ["", "", "", ""];
        }
        question.options[optionIndex] = String(event.target.value || "");
        return;
      }

      if (field === "correctOptionIndex") {
        question.correctOptionIndex = Number(event.target.value || 0);
        return;
      }

      if (field === "correctText") {
        question.correctText = String(event.target.value || "");
      }
    }, {
      rerenderAll: field === "type",
      reopenEditorAfterRerender: field === "type"
    });
  }

  async function handleQuizImportFile(importInput) {
    const file = importInput.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 4_000_000) {
      throw new Error("Файл слишком большой. Ограничение 4 МБ.");
    }

    const declaredType = String(file.type || "").trim().toLowerCase();
    if (declaredType && declaredType !== "application/json") {
      throw new Error("Поддерживается только JSON-файл (application/json).");
    }

    let parsed;
    try {
      parsed = await parseImportedFileJson(file);
    } catch {
      throw new Error("Не удалось прочитать JSON. Проверьте формат файла.");
    }

    const normalizedImportedContent = buildNormalizedQuizContentFromImport(parsed);
    setQuizContentValue(normalizedImportedContent, { rerenderAll: true });
  }

  function handleQuizActionClick(event) {
    const actionButton = event.target.closest("[data-quiz-action]");
    if (!actionButton) {
      return false;
    }

    const action = actionButton.dataset.quizAction;
    if (!action) {
      return false;
    }

    if (action === "create-open") {
      openQuizCreateModal();
      return true;
    }

    if (action === "create-cancel") {
      closeQuizCreateModal();
      return true;
    }

    if (action === "create-confirm") {
      const titleInput = document.querySelector("[data-quiz-create-title='1']");
      const title = String(titleInput?.value || "").trim();
      setQuizValue(
        {
          title: title || "Новая викторина",
          questions: []
        },
        { rerenderAll: true }
      );
      closeQuizCreateModal();
      return true;
    }

    if (action === "import-json") {
      const importInput = settingsContentNode.querySelector("[data-quiz-import-input='1']");
      if (!importInput) {
        showError("Не удалось открыть выбор файла для импорта.");
        return true;
      }
      importInput.value = "";
      importInput.click();
      return true;
    }

    if (action === "clear-quiz") {
      openQuizClearModal();
      return true;
    }

    if (action === "clear-cancel") {
      closeQuizClearModal();
      return true;
    }

    if (action === "clear-confirm") {
      setQuizValue(null, { rerenderAll: true });
      closeQuizClearModal();
      return true;
    }

    if (action === "open-editor") {
      openQuizEditorModal();
      return true;
    }

    if (action === "editor-close") {
      closeQuizEditorModal();
      return true;
    }

    if (action === "add-question") {
      updateQuiz((quiz) => {
        if (!Array.isArray(quiz.questions)) {
          quiz.questions = [];
        }
        quiz.questions.push(createDefaultQuizQuestion());
      }, {
        rerenderAll: true,
        reopenEditorAfterRerender: true
      });
      return true;
    }

    if (action === "preview-question") {
      const index = Number(actionButton.dataset.index);
      if (Number.isNaN(index) || index < 0) {
        return true;
      }
      updateSelectedBlockSetting("content.previewQuestionIndex", index);
      renderBlocks();
      renderPreview();
      renderAll();
      openQuizEditorModal();
      return true;
    }

    if (action === "delete-question") {
      const index = Number(actionButton.dataset.index);
      if (Number.isNaN(index) || index < 0) {
        return true;
      }
      updateQuiz((quiz) => {
        if (!Array.isArray(quiz.questions)) {
          quiz.questions = [];
          return;
        }
        quiz.questions.splice(index, 1);
      }, {
        rerenderAll: true,
        reopenEditorAfterRerender: true
      });
      return true;
    }

    return false;
  }

  async function handleFileUploadInput(fileInput) {
    const file = fileInput.files?.[0];
    const settingPath = fileInput.dataset.fileUpload || fileInput.dataset.mediaUpload || "";
    if (!file) {
      return;
    }
    if (!settingPath) {
      throw new Error("Не найден путь настройки для файла.");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Можно загружать только фото или gif.");
    }
    if (!["image/gif", "image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error("Поддерживаются только PNG, JPG, WEBP и GIF.");
    }
    if (file.size > 1_500_000) {
      throw new Error("Файл слишком большой. Ограничение 1.5 МБ.");
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });

    updateSelectedBlockSetting(`${settingPath}.src`, dataUrl);
    updateSelectedBlockSetting(`${settingPath}.name`, file.name);
    updateSelectedBlockSetting(`${settingPath}.mime`, file.type);
    if (settingPath === "content.media") {
      updateSelectedBlockSetting("content.media.enabled", true);
    }
    syncToggleDependentSections();
    syncBackgroundSectionUi();

    const meta = settingsContentNode.querySelector(`[data-file-meta="${settingPath}"]`) ||
      settingsContentNode.querySelector(".media-file-meta");
    if (meta) {
      meta.textContent = `Текущий файл: ${file.name}`;
    }
    const clear = settingsContentNode.querySelector(`[data-file-clear="${settingPath}"]`) ||
      settingsContentNode.querySelector("[data-media-clear='content.media']");
    if (clear) {
      clear.hidden = false;
    }

    renderPreview();
  }

  function handleSettingsInput(event) {
    if (handleQuizFieldInput(event)) {
      return;
    }

    const field = event.target?.dataset?.settingField;
    const path = event.target?.dataset?.settingPath;
    if (!field && !path) {
      return;
    }

    if (path) {
      let pathValue = event.target.value;
      if (event.target.type === "checkbox" || event.target.dataset.valueType === "boolean") {
        pathValue = Boolean(event.target.checked);
      }
      if (event.target.type === "number" || event.target.dataset.valueType === "number") {
        pathValue = Number(pathValue);
      }
      updateSelectedBlockSetting(path, pathValue);

      if (path === "appearance.backgroundType") {
        syncBackgroundSectionUi();
      }
      if (
        path === "main.displayTarget" ||
        path === "content.media.enabled" ||
        path === "additional.showQr" ||
        path === "additional.connectionPage.enabled"
      ) {
        syncToggleDependentSections();
      }

      renderBlocks();
      renderPreview();
      return;
    }

    const value = String(event.target.value || "");
    if (field === "title") {
      updateSelectedBlock({ title: value });
    }
    if (field === "note") {
      updateSelectedBlock({ note: value });
    }
    renderBlocks();
    renderPreview();
  }

  function handleSettingsClick(event) {
    if (handleQuizActionClick(event)) {
      return;
    }

    const tabButton = event.target.closest("[data-content-tab-target]");
    if (tabButton) {
      switchContentTab(tabButton.dataset.contentTabTarget);
      return;
    }

    const clearButton = event.target.closest("[data-file-clear], [data-media-clear='content.media']");
    if (clearButton) {
      const settingPath = clearButton.dataset.fileClear || clearButton.dataset.mediaClear;
      updateSelectedBlockSetting(`${settingPath}.src`, "");
      updateSelectedBlockSetting(`${settingPath}.name`, "");
      updateSelectedBlockSetting(`${settingPath}.mime`, "");
      const meta = settingsContentNode.querySelector(`[data-file-meta="${settingPath}"]`) ||
        settingsContentNode.querySelector(".media-file-meta");
      if (meta) {
        meta.textContent = "Файл пока не выбран";
      }
      clearButton.hidden = true;
      renderPreview();
    }
  }

  function updatePositionFromPointer(event) {
    if (!activePositionDrag) {
      return;
    }

    const { picker, path } = activePositionDrag;
    const rect = picker.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const nextPosition = getPositionIdByRatios(x, y);
    if (picker.dataset.settingDragValue === nextPosition) {
      return;
    }

    applyPositionPickerState(picker, nextPosition);
    updateSelectedBlockSetting(path, nextPosition);
    renderPreview();
  }

  function stopPositionDrag() {
    activePositionDrag = null;
    window.removeEventListener("pointermove", updatePositionFromPointer);
    window.removeEventListener("pointerup", stopPositionDrag);
    window.removeEventListener("pointercancel", stopPositionDrag);
  }

  function handlePositionDragStart(event) {
    const picker = event.target.closest("[data-setting-drag-path]");
    if (!picker) {
      return;
    }

    const path = picker.dataset.settingDragPath;
    if (!path) {
      return;
    }

    event.preventDefault();
    activePositionDrag = { picker, path };
    updatePositionFromPointer(event);
    window.addEventListener("pointermove", updatePositionFromPointer);
    window.addEventListener("pointerup", stopPositionDrag);
    window.addEventListener("pointercancel", stopPositionDrag);
  }

  function handleEscape() {
    const clearModal = document.querySelector("[data-quiz-clear-modal='quiz-clear-global']");
    if (clearModal && !clearModal.hidden) {
      closeQuizClearModal();
      return true;
    }

    const editorModal = document.querySelector("[data-quiz-editor-modal='quiz-editor-global']");
    if (editorModal && !editorModal.hidden) {
      closeQuizEditorModal();
      return true;
    }

    const createModal = document.querySelector("[data-quiz-create-modal='quiz-global']");
    if (createModal && !createModal.hidden) {
      closeQuizCreateModal();
      return true;
    }
    return false;
  }

  function bind() {
    settingsContentNode.addEventListener("input", handleSettingsInput);
    settingsContentNode.addEventListener("change", handleSettingsInput);
    settingsContentNode.addEventListener("click", handleSettingsClick);

    document.addEventListener("click", (event) => {
      const modalNode = event.target.closest(
        "[data-quiz-create-modal='quiz-global'], [data-quiz-editor-modal='quiz-editor-global'], [data-quiz-clear-modal='quiz-clear-global']"
      );
      if (!modalNode) {
        return;
      }
      if (handleQuizActionClick(event)) {
        event.preventDefault();
      }
    });

    document.addEventListener("input", (event) => {
      if (!event.target.closest("[data-quiz-editor-modal='quiz-editor-global']")) {
        return;
      }
      handleQuizFieldInput(event);
    });

    document.addEventListener("change", (event) => {
      if (!event.target.closest("[data-quiz-editor-modal='quiz-editor-global']")) {
        return;
      }
      handleQuizFieldInput(event);
    });

    settingsContentNode.addEventListener("pointerdown", handlePositionDragStart);
    settingsContentNode.addEventListener("change", (event) => {
      const importInput = event.target.closest("[data-quiz-import-input='1']");
      if (importInput) {
        clearError();
        handleQuizImportFile(importInput).catch((error) => showError(error.message));
        return;
      }

      const uploadInput = event.target.closest("[data-file-upload], [data-media-upload='content.media']");
      if (!uploadInput) {
        return;
      }
      clearError();
      handleFileUploadInput(uploadInput).catch((error) => showError(error.message));
    });

    settingsContentNode.addEventListener(
      "toggle",
      (event) => {
        const accordion = event.target;
        if (!accordion?.classList?.contains("settings-accordion")) {
          return;
        }
        if (!accordion.open) {
          return;
        }
        const form = accordion.closest(".block-settings-form");
        if (!form) {
          return;
        }
        const others = form.querySelectorAll(".settings-accordion[open]");
        for (const node of others) {
          if (node !== accordion) {
            node.open = false;
          }
        }
      },
      true
    );
  }

  return {
    bind,
    handleEscape,
    switchContentTab,
    syncBackgroundSectionUi,
    syncToggleDependentSections
  };
}
