export const QUIZ_SCHEMA_V1 = {
  blockType: "quiz",
  schemaVersion: 1,
  typeVersion: 1
};

export const QUIZ_LAYOUT_PRESETS = {
  cloud: ["cloud_default"],
  pile: ["pile_preset_a", "pile_preset_b"]
};

export const QUIZ_CONTENT_V1_MIN_SHAPE = {
  title: "",
  questions: [],
  leaderboard: {
    enabled: false,
    title: ""
  },
  layouts: {
    textAnswersView: "cloud",
    pilePreset: "pile_preset_a"
  }
};

export function normalizeQuizContentV1(rawContent) {
  const source = rawContent && typeof rawContent === "object" ? rawContent : {};
  const questions = Array.isArray(source.questions) ? source.questions : [];

  return {
    ...QUIZ_CONTENT_V1_MIN_SHAPE,
    ...source,
    title: String(source.title || ""),
    questions: questions.map((question, index) => normalizeQuizQuestionV1(question, index)),
    leaderboard: {
      enabled: Boolean(source?.leaderboard?.enabled),
      title: String(source?.leaderboard?.title || "")
    },
    layouts: {
      textAnswersView: String(source?.layouts?.textAnswersView || "cloud"),
      pilePreset: String(source?.layouts?.pilePreset || "pile_preset_a")
    }
  };
}

export function normalizeQuizQuestionV1(rawQuestion, index = 0) {
  const source = rawQuestion && typeof rawQuestion === "object" ? rawQuestion : {};
  const rawType = String(source.kind || source.type || "choice").trim().toLowerCase();
  const questionType =
    rawType === "text" || rawType === "text_answer" || rawType === "textanswer"
      ? "text"
      : "choice";
  const acceptedAnswers = Array.isArray(source.acceptedAnswers)
    ? source.acceptedAnswers.map((item) => String(item || "").trim()).filter(Boolean)
    : typeof source.acceptedAnswers === "string"
      ? source.acceptedAnswers
          .split(",")
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : String(source.correctText || source.correctAnswer || "")
          .trim()
          .split(",")
          .map((item) => String(item || "").trim())
          .filter(Boolean);
  const thresholdRaw = Number(source?.scoring?.threshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.max(0, Math.min(1, thresholdRaw))
    : 0.75;
  const optionsSource = Array.isArray(source.options)
    ? source.options
    : Array.isArray(source.choices)
      ? source.choices
      : [];
  const options = optionsSource.slice(0, 4).map((item) => String(item || ""));
  while (options.length < 4) {
    options.push("");
  }
  const correctOptionIndexRaw =
    source.correctOptionIndex ?? source.correctIndex ?? source.correct_option_index;
  const correctOptionIndex = Number.isInteger(correctOptionIndexRaw)
    ? Math.max(0, Math.min(3, Number(correctOptionIndexRaw)))
    : null;

  return {
    id: String(source.id || `q${index + 1}`),
    type: questionType,
    kind: questionType,
    questionText: String(source.questionText || ""),
    options,
    choices: options,
    correctOptionIndex,
    correctIndex: correctOptionIndex,
    acceptedAnswers,
    scoring: {
      mode: String(source?.scoring?.mode || "threshold"),
      threshold
    },
    correctText: acceptedAnswers[0] || String(source.correctText || ""),
    points: Number(source.points || 1)
  };
}
