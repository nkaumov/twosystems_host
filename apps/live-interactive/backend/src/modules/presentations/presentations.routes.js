const express = require("express");
const asyncHandler = require("../../middleware/async-handler");
const presentationsService = require("./presentations.service");
const presentationStream = require("../realtime/presentation-stream.service");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const presentations = await presentationsService.listForUser(req.auth.user.id);
    return res.status(200).json({ items: presentations });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const presentation = await presentationsService.create(
      req.auth.user.id,
      req.body?.title
    );

    presentationStream.publishToUser(
      req.auth.user.id,
      "presentation.created",
      presentation
    );

    return res.status(201).json({ item: presentation });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const presentationId = Number(req.params.id);
    if (Number.isNaN(presentationId) || presentationId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор презентации" });
    }

    const presentation = await presentationsService.getByIdForUser({
      presentationId,
      userId: req.auth.user.id
    });

    if (!presentation) {
      return res.status(404).json({ error: "Презентация не найдена" });
    }

    return res.status(200).json({ item: presentation });
  })
);

router.get(
  "/:id/blocks",
  asyncHandler(async (req, res) => {
    const presentationId = Number(req.params.id);
    if (Number.isNaN(presentationId) || presentationId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор презентации" });
    }

    const blocks = await presentationsService.listBlocksForPresentation({
      presentationId,
      userId: req.auth.user.id
    });
    if (blocks === null) {
      return res.status(404).json({ error: "Презентация не найдена" });
    }

    return res.status(200).json({
      items: blocks
    });
  })
);

router.put(
  "/:id/blocks",
  asyncHandler(async (req, res) => {
    const presentationId = Number(req.params.id);
    if (Number.isNaN(presentationId) || presentationId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор презентации" });
    }

    const blocks = await presentationsService.replaceBlocksForPresentation({
      presentationId,
      userId: req.auth.user.id,
      blocks: req.body?.blocks
    });
    if (blocks === null) {
      return res.status(404).json({ error: "Презентация не найдена" });
    }

    presentationStream.publishToUser(req.auth.user.id, "presentation.blocks.updated", {
      presentationId,
      count: blocks.length
    });

    return res.status(200).json({
      items: blocks
    });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const presentationId = Number(req.params.id);
    if (Number.isNaN(presentationId) || presentationId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор презентации" });
    }

    const deletedPresentation = await presentationsService.deleteById({
      presentationId,
      userId: req.auth.user.id
    });

    if (!deletedPresentation) {
      return res.status(404).json({ error: "Презентация не найдена или нет доступа" });
    }

    presentationStream.publishToUser(
      req.auth.user.id,
      "presentation.deleted",
      { id: presentationId }
    );

    return res.status(204).send();
  })
);

module.exports = router;
