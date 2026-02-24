const express = require("express");
const QRCode = require("qrcode");
const asyncHandler = require("../../middleware/async-handler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const payload = String(req.query?.data || "").trim();
    if (!payload) {
      return res.status(400).json({ error: "Параметр data обязателен" });
    }
    if (payload.length > 4000) {
      return res.status(400).json({ error: "Слишком длинное значение data" });
    }

    const sizeRaw = Number(req.query?.size || 512);
    const size = Number.isFinite(sizeRaw) ? Math.max(128, Math.min(2048, Math.round(sizeRaw))) : 512;
    const svg = await QRCode.toString(payload, {
      type: "svg",
      width: size,
      margin: 1,
      errorCorrectionLevel: "M"
    });

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).send(svg);
  })
);

module.exports = router;
