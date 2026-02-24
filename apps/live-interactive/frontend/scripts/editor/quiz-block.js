const DEFAULT_BG_COLOR = "#ffffff";
const DEFAULT_GRADIENT_COLOR = "#d7ede1";
const DEFAULT_QR_SIZE = 22;
const DEFAULT_CONNECTION_QR_SIZE = 36;
const DEFAULT_PREVIEW_QUESTION_INDEX = 0;
const DEFAULT_CHOICE_ANSWERS_VIEW = "chart";
const DEFAULT_TEXT_ANSWERS_VIEW = "cloud";
const QUIZ_QUESTION_TYPE_SINGLE = "SINGLE_CHOICE";
const QUIZ_QUESTION_TYPE_TEXT = "TEXT";

function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  return fallback;
}

function normalizeBackgroundType(value, fallback = "solid") {
  const type = String(value || "").trim();
  if (type === "solid" || type === "linear" || type === "radial" || type === "image") {
    return type;
  }
  return fallback;
}

function normalizeChoiceAnswersView(value, fallback = DEFAULT_CHOICE_ANSWERS_VIEW) {
  const view = String(value || "").trim();
  if (view === "chart" || view === "pie") {
    return view;
  }
  return fallback;
}

function normalizeTextAnswersView(value, fallback = DEFAULT_TEXT_ANSWERS_VIEW) {
  const view = String(value || "").trim();
  if (view === "cloud" || view === "pile") {
    return view;
  }
  return fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function normalizeDisplayTarget(value, fallback = "tv_and_guest") {
  const target = String(value || "").trim();
  if (target === "tv_only" || target === "tv_and_guest") {
    return target;
  }
  return fallback;
}

function normalizePercent(value, fallback, min = 8, max = 60) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeQuestionIndex(value, slidesLength, fallback = DEFAULT_PREVIEW_QUESTION_INDEX) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return fallback;
  }
  if (!slidesLength) {
    return fallback;
  }
  const maxIndex = Math.max(0, slidesLength - 1);
  return Math.max(0, Math.min(maxIndex, Math.round(numeric)));
}

function normalizePosition(value, fallback) {
  const position = String(value || "").trim();
  const valid = new Set([
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center-center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
  ]);
  if (valid.has(position)) {
    return position;
  }
  return fallback;
}

function normalizeQuestionType(value, fallback = QUIZ_QUESTION_TYPE_SINGLE) {
  const type = String(value || "").trim();
  if (type === QUIZ_QUESTION_TYPE_SINGLE || type === QUIZ_QUESTION_TYPE_TEXT) {
    return type;
  }
  return fallback;
}

function normalizeQuestionText(value) {
  return String(value || "").trim();
}

function normalizeOptionText(value) {
  return String(value || "").trim();
}

function normalizeCorrectOptionIndex(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(3, Math.round(numeric)));
}

function normalizeOptions(rawOptions) {
  const source = Array.isArray(rawOptions) ? rawOptions : [];
  const normalized = source.slice(0, 4).map(normalizeOptionText);
  while (normalized.length < 4) {
    normalized.push("");
  }
  return normalized;
}

function normalizeQuestion(rawQuestion) {
  const type = normalizeQuestionType(rawQuestion?.type, QUIZ_QUESTION_TYPE_SINGLE);
  return {
    type,
    questionText: normalizeQuestionText(rawQuestion?.questionText),
    options: normalizeOptions(rawQuestion?.options),
    correctOptionIndex: normalizeCorrectOptionIndex(rawQuestion?.correctOptionIndex),
    correctText: normalizeQuestionText(rawQuestion?.correctText)
  };
}

function normalizeQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) {
    return [];
  }
  return rawQuestions.map(normalizeQuestion);
}

export function createDefaultQuizQuestion() {
  return {
    type: QUIZ_QUESTION_TYPE_SINGLE,
    questionText: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    correctText: ""
  };
}

export function createDefaultQuizDocument(title = "") {
  return {
    title: String(title || "").trim(),
    questions: []
  };
}

export function createDefaultQuizSettings() {
  return {
    main: {
      displayTarget: "tv_and_guest"
    },
    content: {
      quiz: null,
      previewQuestionIndex: DEFAULT_PREVIEW_QUESTION_INDEX
    },
    appearance: {
      backgroundType: "solid",
      backgroundColor: DEFAULT_BG_COLOR,
      gradientColor: DEFAULT_GRADIENT_COLOR,
      choiceAnswersView: DEFAULT_CHOICE_ANSWERS_VIEW,
      textAnswersView: DEFAULT_TEXT_ANSWERS_VIEW,
      backgroundMedia: {
        src: "",
        name: "",
        mime: ""
      }
    },
    additional: {
      showQr: false,
      qrSize: DEFAULT_QR_SIZE,
      qrPosition: "bottom-right",
      connectionPage: {
        enabled: false,
        qrSize: DEFAULT_CONNECTION_QR_SIZE
      }
    }
  };
}

export function normalizeQuizSettings(rawSettings) {
  const defaults = createDefaultQuizSettings();
  const rawAppearance = rawSettings?.appearance || {};
  const rawAdditional = rawSettings?.additional || {};
  const rawQuiz = rawSettings?.content?.quiz;
  const normalizedQuiz =
    rawQuiz && typeof rawQuiz === "object" && !Array.isArray(rawQuiz)
      ? {
          title: String(rawQuiz.title || "").trim(),
          questions: normalizeQuestions(rawQuiz.questions)
        }
      : null;
  const connectionPageEnabled = normalizeBoolean(
    rawAdditional?.connectionPage?.enabled,
    defaults.additional.connectionPage.enabled
  );
  const questionsLength = normalizedQuiz?.questions?.length || 0;
  const slidesLength = questionsLength + (connectionPageEnabled ? 1 : 0);

  return {
    main: {
      displayTarget: normalizeDisplayTarget(
        rawSettings?.main?.displayTarget,
        defaults.main.displayTarget
      )
    },
    content: {
      quiz: normalizedQuiz,
      previewQuestionIndex: normalizeQuestionIndex(
        rawSettings?.content?.previewQuestionIndex,
        slidesLength,
        defaults.content.previewQuestionIndex
      )
    },
    appearance: {
      backgroundType: normalizeBackgroundType(
        rawAppearance.backgroundType,
        defaults.appearance.backgroundType
      ),
      backgroundColor: normalizeColor(
        rawAppearance.backgroundColor,
        defaults.appearance.backgroundColor
      ),
      gradientColor: normalizeColor(
        rawAppearance.gradientColor,
        defaults.appearance.gradientColor
      ),
      choiceAnswersView: normalizeChoiceAnswersView(
        rawAppearance.choiceAnswersView,
        defaults.appearance.choiceAnswersView
      ),
      textAnswersView: normalizeTextAnswersView(
        rawAppearance.textAnswersView,
        defaults.appearance.textAnswersView
      ),
      backgroundMedia: {
        src: String(rawAppearance?.backgroundMedia?.src || "").trim(),
        name: String(rawAppearance?.backgroundMedia?.name || "").trim(),
        mime: String(rawAppearance?.backgroundMedia?.mime || "").trim()
      }
    },
    additional: {
      showQr: normalizeBoolean(rawAdditional.showQr, defaults.additional.showQr),
      qrSize: normalizePercent(rawAdditional.qrSize, defaults.additional.qrSize, 8, 60),
      qrPosition: normalizePosition(rawAdditional.qrPosition, defaults.additional.qrPosition),
      connectionPage: {
        enabled: connectionPageEnabled,
        qrSize: normalizePercent(
          rawAdditional?.connectionPage?.qrSize,
          defaults.additional.connectionPage.qrSize,
          12,
          82
        )
      }
    }
  };
}
