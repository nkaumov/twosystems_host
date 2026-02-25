const env = require("../../config/env");
const liveRepository = require("./live.repository");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function toObject(value, fallback = {}) {
  if (!value) {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJsonValue(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePositiveInt(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }
  return number;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeBaseUrl() {
  return String(env.publicBaseUrl || "").trim().replace(/\/+$/, "");
}

function buildPublicUrl(pathname) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    return path;
  }
  return `${baseUrl}${path}`;
}

function buildLinksDto({ presentationId, liveSessionId, links }) {
  const tv = links.find((item) => item.link_type === "tv" || item.type === "tv");
  const guest = links.find((item) => item.link_type === "guest" || item.type === "guest");
  const adminUrl = buildPublicUrl(`/presentations/${presentationId}/live?sessionId=${liveSessionId}`);
  const tvUrl = tv ? buildPublicUrl(`/tv/${tv.access_token || tv.token}`) : null;
  const guestUrl = guest ? buildPublicUrl(`/guest/${guest.access_token || guest.token}`) : null;

  return {
    adminUrl,
    tvUrl,
    guestUrl
  };
}

function buildLiveSettings() {
  return {
    onAirSessionBlockId: null,
    quiz: {
      currentQuestionIndex: 0
    },
    updatedAt: new Date().toISOString()
  };
}

function mapSessionBlockRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    type: row.block_type,
    title: row.title,
    sortOrder: row.sort_order,
    content: toJsonValue(row.content_json, null),
    config: toJsonValue(row.config_json, null),
    appearance: toJsonValue(row.appearance_json, null)
  };
}

function resolveQuizQuestions(onAirBlock) {
  const contentJson = toJsonValue(onAirBlock?.content_json, {});
  const nestedQuestions = contentJson?.content?.quiz?.questions;
  if (Array.isArray(nestedQuestions)) {
    return nestedQuestions;
  }
  const fallbackQuestions = contentJson?.quiz?.questions;
  if (Array.isArray(fallbackQuestions)) {
    return fallbackQuestions;
  }
  return [];
}

function resolveQuestionText(question) {
  return String(question?.text || question?.questionText || "").trim();
}

function resolveQuestionKind(question) {
  const kind = String(question?.kind || question?.type || "").trim().toLowerCase();
  if (kind === "choice" || kind === "single_choice") {
    return "choice";
  }
  if (kind === "text") {
    return "text";
  }
  return null;
}

function resolveChoiceOptions(question) {
  if (Array.isArray(question?.choices)) {
    return question.choices.map((item) => String(item || "").trim());
  }
  if (Array.isArray(question?.options)) {
    return question.options
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

function mapGuestRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    displayName: row.display_name || "Гость"
  };
}

async function startLiveForPresentation({ presentationId, ownerUserId }) {
  const normalizedPresentationId = Number(presentationId);
  if (!Number.isInteger(normalizedPresentationId) || normalizedPresentationId <= 0) {
    throw badRequest("Invalid presentation id.");
  }

  const presentation = await liveRepository.findPresentationOwnedByUser({
    presentationId: normalizedPresentationId,
    ownerUserId
  });
  if (!presentation) {
    throw notFound("Presentation not found.");
  }

  const session = await liveRepository.createLiveSession({
    presentationId: normalizedPresentationId,
    ownerUserId,
    settingsJson: buildLiveSettings()
  });
  if (!session) {
    throw new Error("Unable to start live session.");
  }

  await liveRepository.createSessionLinks({ liveSessionId: session.id });
  await liveRepository.copyPresentationBlocksToSession({
    presentationId: normalizedPresentationId,
    liveSessionId: session.id
  });

  const links = await liveRepository.getSessionLinks({ liveSessionId: session.id });

  return {
    liveSessionId: session.id,
    links: buildLinksDto({
      presentationId: normalizedPresentationId,
      liveSessionId: session.id,
      links
    })
  };
}

async function getLiveSnapshotForOwner({ liveSessionId, ownerUserId }) {
  const normalizedSessionId = Number(liveSessionId);
  if (!Number.isInteger(normalizedSessionId) || normalizedSessionId <= 0) {
    throw badRequest("Invalid live session id.");
  }

  const session = await liveRepository.getSessionByIdForOwner({
    liveSessionId: normalizedSessionId,
    ownerUserId
  });
  if (!session) {
    return null;
  }

  const linksRows = await liveRepository.getSessionLinks({
    liveSessionId: normalizedSessionId
  });
  const blockRows = await liveRepository.listSessionBlocks({
    liveSessionId: normalizedSessionId
  });

  const links = buildLinksDto({
    presentationId: session.presentation_id,
    liveSessionId: session.id,
    links: linksRows
  });

  return {
    session: {
      id: session.id,
      presentationId: session.presentation_id,
      startedByUserId: session.started_by_user_id,
      sessionCode: session.session_code,
      status: session.status,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      settings: toObject(session.settings_json, {}),
      createdAt: session.created_at,
      updatedAt: session.updated_at
    },
    links,
    blocks: blockRows.map((row) => ({
      ...mapSessionBlockRow(row)
    }))
  };
}

async function getLiveSnapshotForLink({ accessToken }) {
  const token = String(accessToken || "").trim();
  if (!token) {
    throw badRequest("Токен ссылки не указан.");
  }

  const linkRow = await liveRepository.getSessionLinkByToken({
    accessToken: token
  });
  if (!linkRow) {
    return null;
  }

  const session = await liveRepository.getSessionById({
    liveSessionId: linkRow.live_session_id
  });
  if (!session) {
    return null;
  }

  const settings = toObject(session.settings_json, {});
  const onAirSessionBlockId = normalizePositiveInt(settings?.onAirSessionBlockId);
  const blocks = await liveRepository.listSessionBlocks({
    liveSessionId: session.id
  });
  const onAirBlockRow = onAirSessionBlockId
    ? blocks.find((item) => Number(item.id) === onAirSessionBlockId) || null
    : null;

  return {
    session: {
      id: session.id,
      status: session.status,
      startsAt: session.starts_at,
      settings
    },
    link: {
      type: linkRow.link_type
    },
    onAir: {
      sessionBlockId: onAirSessionBlockId,
      block: mapSessionBlockRow(onAirBlockRow)
    }
  };
}

async function setOnAirBlockForOwner({ liveSessionId, ownerUserId, sessionBlockId }) {
  const normalizedSessionId = normalizePositiveInt(liveSessionId);
  if (!normalizedSessionId) {
    throw badRequest("Некорректный идентификатор live-сессии.");
  }

  const session = await liveRepository.getSessionByIdForOwner({
    liveSessionId: normalizedSessionId,
    ownerUserId
  });
  if (!session) {
    throw notFound("Live-сессия не найдена.");
  }

  let normalizedSessionBlockId = null;
  let onAirBlock = null;

  if (sessionBlockId !== null && sessionBlockId !== undefined) {
    normalizedSessionBlockId = normalizePositiveInt(sessionBlockId);
    if (!normalizedSessionBlockId) {
      throw badRequest("Некорректный идентификатор блока эфира.");
    }

    const blockRow = await liveRepository.getSessionBlockById({
      liveSessionId: normalizedSessionId,
      sessionBlockId: normalizedSessionBlockId
    });
    if (!blockRow) {
      throw notFound("Блок сессии не найден.");
    }
    onAirBlock = mapSessionBlockRow(blockRow);
  }

  const settings = await liveRepository.updateLiveSettings({
    liveSessionId: normalizedSessionId,
    patch: {
      onAirSessionBlockId: normalizedSessionBlockId,
      quiz: {
        currentQuestionIndex: 0
      }
    }
  });
  if (!settings) {
    throw notFound("Live-сессия не найдена.");
  }

  return {
    liveSessionId: normalizedSessionId,
    settings,
    onAirSessionBlockId: normalizedSessionBlockId,
    onAirBlock
  };
}

async function setQuizQuestionIndexForOwner({ liveSessionId, ownerUserId, nextIndex }) {
  const normalizedSessionId = normalizePositiveInt(liveSessionId);
  if (!normalizedSessionId) {
    throw badRequest("Некорректный идентификатор live-сессии.");
  }

  const session = await liveRepository.getSessionByIdForOwner({
    liveSessionId: normalizedSessionId,
    ownerUserId
  });
  if (!session) {
    throw notFound("Live-сессия не найдена.");
  }

  const settings = toObject(session.settings_json, {});
  const onAirSessionBlockId = normalizePositiveInt(settings?.onAirSessionBlockId);
  if (!onAirSessionBlockId) {
    throw badRequest("Сначала выберите блок On Air.");
  }

  const onAirBlockRow = await liveRepository.getSessionBlockById({
    liveSessionId: normalizedSessionId,
    sessionBlockId: onAirSessionBlockId
  });
  if (!onAirBlockRow) {
    throw notFound("On Air блок не найден.");
  }
  if (onAirBlockRow.block_type !== "quiz") {
    throw badRequest("On Air блок не является викториной.");
  }

  const questions = resolveQuizQuestions(onAirBlockRow);
  if (!questions.length) {
    throw badRequest("В викторине нет вопросов.");
  }

  const numericNextIndex = Number(nextIndex);
  const clampedIndex = clamp(numericNextIndex, 0, questions.length - 1);
  const updatedSettings = await liveRepository.updateLiveSettings({
    liveSessionId: normalizedSessionId,
    patch: {
      quiz: {
        currentQuestionIndex: clampedIndex
      }
    }
  });
  if (!updatedSettings) {
    throw notFound("Live-сессия не найдена.");
  }

  return {
    liveSessionId: normalizedSessionId,
    settings: updatedSettings,
    currentQuestionIndex: clampedIndex,
    question: questions[clampedIndex] || null
  };
}

function validateGuestAction(action) {
  if (!action || typeof action !== "object") {
    throw badRequest("Некорректный формат действия гостя.");
  }

  const type = normalizeString(action.type);
  if (!["quiz.answer", "poll.vote"].includes(type)) {
    throw badRequest("Поддерживаются только действия quiz.answer и poll.vote.");
  }

  const sessionBlockId = normalizePositiveInt(action.sessionBlockId);
  if (!sessionBlockId) {
    throw badRequest("Некорректный sessionBlockId в действии гостя.");
  }

  if (type === "poll.vote") {
    const optionIndex = Number(action.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      throw badRequest("Для poll.vote требуется корректный optionIndex.");
    }
    return {
      type,
      sessionBlockId,
      payload: {
        optionIndex
      }
    };
  }

  const questionIndex = Number(action.questionIndex);
  if (!Number.isInteger(questionIndex) || questionIndex < 0) {
    throw badRequest("Для quiz.answer требуется questionIndex.");
  }
  const mode = normalizeString(action.mode).toLowerCase();
  if (!["choice", "text"].includes(mode)) {
    throw badRequest("Для quiz.answer mode должен быть choice или text.");
  }

  if (mode === "choice") {
    const optionIndex = Number(action.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      throw badRequest("Для quiz.answer(choice) требуется optionIndex.");
    }
    return {
      type,
      sessionBlockId,
      payload: {
        questionIndex,
        mode: "choice",
        optionIndex
      }
    };
  }

  const text = normalizeString(action.text).slice(0, 2000);
  if (!text) {
    throw badRequest("Для quiz.answer(text) требуется непустой текст.");
  }
  return {
    type,
    sessionBlockId,
    payload: {
      questionIndex,
      mode: "text",
      text
    }
  };
}

async function joinGuestByToken({ accessToken, deviceKey, displayName }) {
  const token = normalizeString(accessToken);
  if (!token) {
    throw badRequest("Токен ссылки не указан.");
  }

  const normalizedDeviceKey = normalizeString(deviceKey).slice(0, 128);
  if (!normalizedDeviceKey) {
    throw badRequest("deviceKey обязателен для подключения гостя.");
  }

  const normalizedDisplayName = normalizeString(displayName).slice(0, 120) || "Гость";

  const link = await liveRepository.getSessionLinkByToken({
    accessToken: token
  });
  if (!link) {
    throw notFound("Ссылка подключения не найдена.");
  }
  if (link.link_type !== "guest") {
    throw forbidden("Эта ссылка не предназначена для гостей.");
  }

  const liveSessionId = Number(link.live_session_id);
  if (!liveSessionId) {
    throw notFound("Live-сессия не найдена.");
  }

  let guest = await liveRepository.getGuestByDeviceKey({
    liveSessionId,
    deviceKey: normalizedDeviceKey
  });

  if (!guest) {
    guest = await liveRepository.createGuest({
      liveSessionId,
      deviceKey: normalizedDeviceKey,
      displayName: normalizedDisplayName
    });
  } else if (normalizedDisplayName && normalizedDisplayName !== guest.display_name) {
    guest = await liveRepository.upsertGuestName({
      liveSessionId,
      guestId: guest.id,
      displayName: normalizedDisplayName
    });
  } else {
    await liveRepository.touchGuestSeen({
      liveSessionId,
      guestId: guest.id
    });
  }

  return {
    liveSessionId,
    guest: mapGuestRow(guest),
    deviceKey: normalizedDeviceKey
  };
}

async function getOnAirStatsForSession({ liveSessionId }) {
  const session = await liveRepository.getSessionById({ liveSessionId });
  if (!session) {
    return null;
  }

  const settings = toObject(session.settings_json, {});
  const onAirSessionBlockId = normalizePositiveInt(settings?.onAirSessionBlockId);
  if (!onAirSessionBlockId) {
    return null;
  }

  const onAirBlock = await liveRepository.getSessionBlockById({
    liveSessionId,
    sessionBlockId: onAirSessionBlockId
  });
  if (!onAirBlock) {
    return null;
  }

  if (onAirBlock.block_type === "quiz") {
    const questionIndex = Number(settings?.quiz?.currentQuestionIndex);
    const safeQuestionIndex = Number.isInteger(questionIndex) && questionIndex >= 0 ? questionIndex : 0;
    const stats = await liveRepository.getQuizStats({
      liveSessionId,
      sessionBlockId: onAirSessionBlockId,
      questionIndex: safeQuestionIndex
    });
    return {
      liveSessionId,
      sessionBlockId: onAirSessionBlockId,
      blockType: "quiz",
      questionIndex: safeQuestionIndex,
      stats
    };
  }

  if (onAirBlock.block_type === "poll") {
    const stats = await liveRepository.getPollStats({
      liveSessionId,
      sessionBlockId: onAirSessionBlockId
    });
    return {
      liveSessionId,
      sessionBlockId: onAirSessionBlockId,
      blockType: "poll",
      questionIndex: null,
      stats
    };
  }

  return null;
}

async function submitGuestActionByToken({ accessToken, deviceKey, action }) {
  const token = normalizeString(accessToken);
  if (!token) {
    throw badRequest("Токен ссылки не указан.");
  }

  const normalizedDeviceKey = normalizeString(deviceKey).slice(0, 128);
  if (!normalizedDeviceKey) {
    throw badRequest("deviceKey обязателен для отправки действия.");
  }

  const link = await liveRepository.getSessionLinkByToken({
    accessToken: token
  });
  if (!link) {
    throw notFound("Ссылка подключения не найдена.");
  }
  if (link.link_type !== "guest") {
    throw forbidden("Эта ссылка не предназначена для действий гостей.");
  }

  const liveSessionId = Number(link.live_session_id);
  const guest = await liveRepository.getGuestByDeviceKey({
    liveSessionId,
    deviceKey: normalizedDeviceKey
  });
  if (!guest) {
    throw badRequest("Гость не подключён. Выполните join перед отправкой ответа.");
  }

  const validatedAction = validateGuestAction(action);
  const blockRow = await liveRepository.getSessionBlockById({
    liveSessionId,
    sessionBlockId: validatedAction.sessionBlockId
  });
  if (!blockRow) {
    throw notFound("Блок live-сессии не найден.");
  }

  if (validatedAction.type === "quiz.answer" && blockRow.block_type !== "quiz") {
    throw badRequest("quiz.answer допустим только для quiz блока.");
  }
  if (validatedAction.type === "poll.vote" && blockRow.block_type !== "poll") {
    throw badRequest("poll.vote допустим только для poll блока.");
  }

  if (validatedAction.type === "quiz.answer") {
    const questions = resolveQuizQuestions(blockRow);
    const question = questions[validatedAction.payload.questionIndex];
    if (!question) {
      throw badRequest("Вопрос викторины не найден.");
    }
    const kind = resolveQuestionKind(question);
    if (validatedAction.payload.mode === "choice" && kind && kind !== "choice") {
      throw badRequest("Текущий вопрос не поддерживает выбор варианта.");
    }
    if (validatedAction.payload.mode === "text" && kind && kind !== "text") {
      throw badRequest("Текущий вопрос не поддерживает текстовый ответ.");
    }
    if (validatedAction.payload.mode === "choice") {
      const options = resolveChoiceOptions(question);
      if (options.length && validatedAction.payload.optionIndex >= options.length) {
        throw badRequest("optionIndex выходит за пределы вариантов ответа.");
      }
    }
    const text = resolveQuestionText(question);
    if (!text) {
      throw badRequest("Текст вопроса викторины пустой.");
    }
  }

  const insertedAction = await liveRepository.insertGuestAction({
    liveSessionId,
    guestId: guest.id,
    sessionBlockId: validatedAction.sessionBlockId,
    actionType: validatedAction.type,
    payloadJson: validatedAction.payload
  });
  await liveRepository.touchGuestSeen({
    liveSessionId,
    guestId: guest.id
  });

  let onAirStats = null;
  const session = await liveRepository.getSessionById({ liveSessionId });
  const settings = toObject(session?.settings_json, {});
  const onAirSessionBlockId = normalizePositiveInt(settings?.onAirSessionBlockId);
  if (onAirSessionBlockId && onAirSessionBlockId === validatedAction.sessionBlockId) {
    if (blockRow.block_type === "quiz") {
      const currentQuestionIndex = Number(settings?.quiz?.currentQuestionIndex);
      if (
        Number.isInteger(currentQuestionIndex) &&
        validatedAction.payload.questionIndex === currentQuestionIndex
      ) {
        onAirStats = await liveRepository.getQuizStats({
          liveSessionId,
          sessionBlockId: validatedAction.sessionBlockId,
          questionIndex: currentQuestionIndex
        });
        onAirStats = {
          liveSessionId,
          sessionBlockId: validatedAction.sessionBlockId,
          blockType: "quiz",
          questionIndex: currentQuestionIndex,
          stats: onAirStats
        };
      }
    } else if (blockRow.block_type === "poll") {
      onAirStats = await liveRepository.getPollStats({
        liveSessionId,
        sessionBlockId: validatedAction.sessionBlockId
      });
      onAirStats = {
        liveSessionId,
        sessionBlockId: validatedAction.sessionBlockId,
        blockType: "poll",
        questionIndex: null,
        stats: onAirStats
      };
    }
  }

  return {
    ok: true,
    liveSessionId,
    guest: mapGuestRow(guest),
    action: {
      id: insertedAction?.id || null,
      type: validatedAction.type,
      sessionBlockId: validatedAction.sessionBlockId,
      payload: validatedAction.payload
    },
    onAirStats
  };
}

module.exports = {
  startLiveForPresentation,
  getLiveSnapshotForOwner,
  getLiveSnapshotForLink,
  setOnAirBlockForOwner,
  setQuizQuestionIndexForOwner,
  joinGuestByToken,
  submitGuestActionByToken,
  getOnAirStatsForSession
};
