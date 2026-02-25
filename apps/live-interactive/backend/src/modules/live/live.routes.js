const express = require("express");
const asyncHandler = require("../../middleware/async-handler");
const { requireApiSession } = require("../../middleware/session-guards");
const liveService = require("./live.service");
const sseBroker = require("./sse-broker");

const router = express.Router();

function parsePositiveId(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function setupSseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

router.post(
  "/presentations/:id/live/start",
  requireApiSession,
  asyncHandler(async (req, res) => {
    const presentationId = parsePositiveId(req.params.id);
    if (!presentationId) {
      return res.status(400).json({ error: "Некорректный идентификатор презентации." });
    }

    const ownerUserId = req.auth.user.id;
    const result = await liveService.startLiveForPresentation({
      presentationId,
      ownerUserId
    });
    const snapshot = await liveService.getLiveSnapshotForOwner({
      liveSessionId: result.liveSessionId,
      ownerUserId
    });
    if (snapshot) {
      sseBroker.emit(result.liveSessionId, "live.session.snapshot", snapshot);
    }

    return res.status(201).json(result);
  })
);

router.get(
  "/live/sessions/:sessionId/stream",
  requireApiSession,
  asyncHandler(async (req, res) => {
    const liveSessionId = parsePositiveId(req.params.sessionId);
    if (!liveSessionId) {
      return res.status(400).json({ error: "Некорректный идентификатор live-сессии." });
    }

    const snapshot = await liveService.getLiveSnapshotForOwner({
      liveSessionId,
      ownerUserId: req.auth.user.id
    });
    if (!snapshot) {
      return res.status(404).json({ error: "Live-сессия не найдена." });
    }

    setupSseHeaders(res);

    sseBroker.subscribe(liveSessionId, res);
    sseBroker.sendEvent(res, "live.session.snapshot", snapshot);

    req.on("close", () => {
      sseBroker.unsubscribe(liveSessionId, res);
    });
  })
);

router.post(
  "/live/sessions/:sessionId/on-air",
  requireApiSession,
  asyncHandler(async (req, res) => {
    const liveSessionId = parsePositiveId(req.params.sessionId);
    if (!liveSessionId) {
      return res.status(400).json({ error: "Некорректный идентификатор live-сессии." });
    }

    const rawSessionBlockId = req.body?.sessionBlockId;
    const sessionBlockId =
      rawSessionBlockId === null || rawSessionBlockId === undefined
        ? null
        : parsePositiveId(rawSessionBlockId);
    if (rawSessionBlockId !== null && rawSessionBlockId !== undefined && !sessionBlockId) {
      return res.status(400).json({ error: "Некорректный идентификатор блока On Air." });
    }

    const result = await liveService.setOnAirBlockForOwner({
      liveSessionId,
      ownerUserId: req.auth.user.id,
      sessionBlockId
    });

    const payload = {
      liveSessionId: result.liveSessionId,
      onAirSessionBlockId: result.onAirSessionBlockId,
      block: result.onAirBlock,
      quiz: {
        currentQuestionIndex: Number(result.settings?.quiz?.currentQuestionIndex) || 0
      }
    };

    sseBroker.emit(liveSessionId, "live.block.changed", payload);
    const onAirStats = await liveService.getOnAirStatsForSession({ liveSessionId });
    if (onAirStats) {
      sseBroker.emit(liveSessionId, "live.onair.stats", onAirStats);
    }
    return res.status(200).json(payload);
  })
);

router.post(
  "/live/sessions/:sessionId/quiz/question",
  requireApiSession,
  asyncHandler(async (req, res) => {
    const liveSessionId = parsePositiveId(req.params.sessionId);
    if (!liveSessionId) {
      return res.status(400).json({ error: "Некорректный идентификатор live-сессии." });
    }

    const action = String(req.body?.action || "").trim();
    if (!["next", "prev", "set"].includes(action)) {
      return res.status(400).json({ error: "Некорректное действие для переключения вопроса." });
    }

    const ownerUserId = req.auth.user.id;
    const snapshot = await liveService.getLiveSnapshotForOwner({
      liveSessionId,
      ownerUserId
    });
    if (!snapshot) {
      return res.status(404).json({ error: "Live-сессия не найдена." });
    }

    const currentIndex = Number(snapshot.session?.settings?.quiz?.currentQuestionIndex) || 0;
    let nextIndex = currentIndex;
    if (action === "next") {
      nextIndex = currentIndex + 1;
    } else if (action === "prev") {
      nextIndex = currentIndex - 1;
    } else {
      const parsedSetIndex = Number(req.body?.index);
      if (!Number.isInteger(parsedSetIndex)) {
        return res.status(400).json({ error: "Для действия set требуется числовой index." });
      }
      nextIndex = parsedSetIndex;
    }

    const result = await liveService.setQuizQuestionIndexForOwner({
      liveSessionId,
      ownerUserId,
      nextIndex
    });

    const payload = {
      liveSessionId: result.liveSessionId,
      currentQuestionIndex: result.currentQuestionIndex,
      question: result.question
    };

    sseBroker.emit(liveSessionId, "live.quiz.question.changed", payload);
    const onAirStats = await liveService.getOnAirStatsForSession({ liveSessionId });
    if (onAirStats) {
      sseBroker.emit(liveSessionId, "live.onair.stats", onAirStats);
    }
    return res.status(200).json(payload);
  })
);

router.post(
  "/live/links/:token/guest/join",
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Токен ссылки не указан." });
    }

    const result = await liveService.joinGuestByToken({
      accessToken: token,
      deviceKey: req.body?.deviceKey,
      displayName: req.body?.displayName
    });

    sseBroker.emit(result.liveSessionId, "live.guest.joined", {
      liveSessionId: result.liveSessionId,
      guest: result.guest
    });

    return res.status(200).json({
      liveSessionId: result.liveSessionId,
      guest: result.guest,
      deviceKey: result.deviceKey
    });
  })
);

router.post(
  "/live/links/:token/guest/action",
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Токен ссылки не указан." });
    }

    const result = await liveService.submitGuestActionByToken({
      accessToken: token,
      deviceKey: req.body?.deviceKey,
      action: req.body?.action
    });

    sseBroker.emit(result.liveSessionId, "live.guest.action", {
      liveSessionId: result.liveSessionId,
      guestId: result.guest?.id || null,
      sessionBlockId: result.action?.sessionBlockId || null,
      type: result.action?.type || null,
      payload: result.action?.payload || null
    });

    if (result.onAirStats) {
      sseBroker.emit(result.liveSessionId, "live.onair.stats", result.onAirStats);
    }

    return res.status(200).json({ ok: true });
  })
);

router.get(
  "/live/links/:token/stream",
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Токен ссылки не указан." });
    }

    const snapshot = await liveService.getLiveSnapshotForLink({
      accessToken: token
    });
    if (!snapshot) {
      return res.status(404).json({ error: "Live-сессия не найдена по токену." });
    }

    setupSseHeaders(res);

    const sessionId = snapshot.session?.id;
    sseBroker.subscribe(sessionId, res);
    sseBroker.sendEvent(res, "live.session.snapshot", snapshot);

    req.on("close", () => {
      sseBroker.unsubscribe(sessionId, res);
    });
  })
);

module.exports = router;
