const express = require("express");
const asyncHandler = require("../../middleware/async-handler");
const presentationStream = require("./presentation-stream.service");

const router = express.Router();

router.get(
  "/presentations/stream",
  asyncHandler(async (req, res) => {
    const userId = req.auth.user.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    presentationStream.addClient(userId, res);
    presentationStream.sendEvent(res, "connected", {
      ok: true,
      timestamp: new Date().toISOString()
    });

    const stopHeartbeat = presentationStream.startHeartbeat(res);

    req.on("close", () => {
      stopHeartbeat();
      presentationStream.removeClient(userId, res);
    });
  })
);

module.exports = router;
