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
  const questionType = String(source.type || "choice").toLowerCase() === "text" ? "text" : "choice";
  const acceptedAnswers = Array.isArray(source.acceptedAnswers)
    ? source.acceptedAnswers.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    id: String(source.id || `q${index + 1}`),
    type: questionType,
    questionText: String(source.questionText || ""),
    options: Array.isArray(source.options) ? source.options.map((item) => String(item || "")) : [],
    correctOptionIndex: Number.isInteger(source.correctOptionIndex) ? source.correctOptionIndex : null,
    acceptedAnswers,
    scoring: {
      mode: String(source?.scoring?.mode || "threshold"),
      threshold: Number(source?.scoring?.threshold || 0.8)
    },
    points: Number(source.points || 1)
  };
}

