const QUIZ_SCHEMA_V1 = {
  blockType: "quiz",
  schemaVersion: 1,
  typeVersion: 1
};

const MAX_TITLE_LENGTH = 200;
const MAX_NOTE_LENGTH = 800;
const MAX_QUESTION_TEXT_LENGTH = 500;
const MAX_OPTION_TEXT_LENGTH = 300;
const MAX_ANSWER_TEXT_LENGTH = 150;
const MAX_QUESTIONS_COUNT = 200;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asPositiveInt(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function asClampedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function resolveQuestionKind(question) {
  const kind = String(question?.kind || "")
    .trim()
    .toLowerCase();
  if (kind === "choice" || kind === "text") {
    return kind;
  }

  const legacyType = String(question?.type || "")
    .trim()
    .toUpperCase();
  if (legacyType === "SINGLE_CHOICE") {
    return "choice";
  }
  if (legacyType === "TEXT") {
    return "text";
  }

  return "";
}

function normalizeChoiceQuestion(question, index) {
  const rawChoices = Array.isArray(question?.choices)
    ? question.choices
    : Array.isArray(question?.options)
      ? question.options
      : null;

  if (!rawChoices) {
    throw badRequest(`Question #${index + 1}: choice question requires choices/options array.`);
  }
  if (rawChoices.length !== 4) {
    throw badRequest(`Question #${index + 1}: choices/options must contain exactly 4 items.`);
  }

  const choices = rawChoices.map((item) => normalizeText(item, MAX_OPTION_TEXT_LENGTH));
  const correctIndexCandidate =
    question?.correctIndex !== undefined ? question.correctIndex : question?.correctOptionIndex;
  const correctIndex = Number(correctIndexCandidate);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw badRequest(`Question #${index + 1}: correctIndex must be an integer in [0..3].`);
  }

  return {
    id: normalizeText(question?.id || `q${index + 1}`, 50),
    kind: "choice",
    type: "SINGLE_CHOICE",
    questionText: normalizeText(question?.questionText, MAX_QUESTION_TEXT_LENGTH),
    choices,
    // Backward compatible field for current frontend.
    options: choices,
    correctIndex,
    // Backward compatible field for current frontend.
    correctOptionIndex: correctIndex,
    points: Math.round(asClampedNumber(question?.points, 1, 0, 100))
  };
}

function normalizeAcceptedAnswers(rawAcceptedAnswers, rawCorrectText) {
  if (Array.isArray(rawAcceptedAnswers)) {
    return rawAcceptedAnswers
      .map((item) => normalizeText(item, MAX_ANSWER_TEXT_LENGTH))
      .filter(Boolean);
  }

  if (typeof rawAcceptedAnswers === "string") {
    return rawAcceptedAnswers
      .split(",")
      .map((item) => normalizeText(item, MAX_ANSWER_TEXT_LENGTH))
      .filter(Boolean);
  }

  const fallback = normalizeText(rawCorrectText, MAX_ANSWER_TEXT_LENGTH);
  return fallback ? [fallback] : [];
}

function normalizeTextQuestion(question, index) {
  const acceptedAnswers = normalizeAcceptedAnswers(question?.acceptedAnswers, question?.correctText);
  const threshold = asClampedNumber(question?.scoring?.threshold, 0.75, 0, 1);

  return {
    id: normalizeText(question?.id || `q${index + 1}`, 50),
    kind: "text",
    type: "TEXT",
    questionText: normalizeText(question?.questionText, MAX_QUESTION_TEXT_LENGTH),
    acceptedAnswers,
    scoring: {
      mode: "threshold",
      threshold
    },
    // Backward compatible field for current frontend.
    correctText: acceptedAnswers[0] || "",
    points: Math.round(asClampedNumber(question?.points, 1, 0, 100))
  };
}

function normalizeQuestion(question, index) {
  const kind = resolveQuestionKind(question);
  if (!kind) {
    throw badRequest(`Question #${index + 1}: kind must be "choice" or "text".`);
  }

  if (kind === "choice") {
    return normalizeChoiceQuestion(question, index);
  }
  return normalizeTextQuestion(question, index);
}

function normalizeQuizContent(rawContent) {
  const content = asObject(rawContent);
  const quiz = content.quiz;
  if (quiz === null || quiz === undefined) {
    return {
      ...content,
      quiz: null
    };
  }

  const quizObject = asObject(quiz);
  if (!Array.isArray(quizObject.questions)) {
    throw badRequest("quiz.questions must be an array.");
  }
  if (quizObject.questions.length > MAX_QUESTIONS_COUNT) {
    throw badRequest(`Too many quiz questions: maximum is ${MAX_QUESTIONS_COUNT}.`);
  }

  const normalizedQuestions = quizObject.questions.map((question, index) => normalizeQuestion(question, index));
  return {
    ...content,
    quiz: {
      title: normalizeText(quizObject.title, MAX_TITLE_LENGTH),
      questions: normalizedQuestions
    }
  };
}

function validateAndNormalize(editorBlock) {
  const block = asObject(editorBlock);
  const settings = asObject(block.settings);

  return {
    ...block,
    type: "quiz",
    title: normalizeText(block.title, MAX_TITLE_LENGTH),
    note: normalizeText(block.note, MAX_NOTE_LENGTH),
    schemaVersion: asPositiveInt(block.schemaVersion, QUIZ_SCHEMA_V1.schemaVersion),
    typeVersion: asPositiveInt(block.typeVersion, QUIZ_SCHEMA_V1.typeVersion),
    settings: {
      main: asObject(settings.main),
      additional: asObject(settings.additional),
      appearance: asObject(settings.appearance),
      content: normalizeQuizContent(settings.content)
    }
  };
}

module.exports = {
  QUIZ_SCHEMA_V1,
  validateAndNormalize
};

