const presentationsRepository = require("./presentations.repository");
const { validateAndExtractDbJsonParts } = require("../block-schemas/compile");

function normalizePresentation(presentation) {
  return {
    id: presentation.id,
    ownerUserId: presentation.owner_user_id,
    title: presentation.title,
    description: presentation.description,
    status: presentation.status,
    version: presentation.version,
    themeSettings: presentation.theme_settings_json,
    runtimeSettings: presentation.runtime_settings_json,
    createdAt: presentation.created_at,
    updatedAt: presentation.updated_at
  };
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

function normalizePresentationBlockRow(row) {
  const contentJson = toObject(row.content_json, {});
  const configJson = toObject(row.config_json, {});
  const appearanceJson = toObject(row.appearance_json, {});
  const parsedSchemaVersion = Number(contentJson?.schemaVersion);
  const parsedTypeVersion = Number(contentJson?.typeVersion);
  const schemaVersion =
    Number.isInteger(parsedSchemaVersion) && parsedSchemaVersion > 0
      ? parsedSchemaVersion
      : 1;
  const typeVersion =
    Number.isInteger(parsedTypeVersion) && parsedTypeVersion > 0
      ? parsedTypeVersion
      : 1;

  return {
    id: `db_${row.id}`,
    type: row.block_type,
    title: row.title,
    note: String(contentJson?.note || ""),
    schemaVersion,
    typeVersion,
    createdAt: row.created_at,
    settings: {
      main:
        configJson?.main && typeof configJson.main === "object"
          ? configJson.main
          : {},
      content:
        contentJson?.content && typeof contentJson.content === "object"
          ? contentJson.content
          : {},
      appearance:
        appearanceJson && typeof appearanceJson === "object"
          ? appearanceJson
          : {},
      additional:
        configJson?.additional && typeof configJson.additional === "object"
          ? configJson.additional
          : {}
    }
  };
}

function normalizeInputBlock(rawBlock) {
  const { normalized, dbJson } = validateAndExtractDbJsonParts(rawBlock);
  const type = String(normalized.type || "").trim();
  const title = String(normalized.title || "").trim();

  if (!title) {
    const error = new Error("Название блока обязательно.");
    error.statusCode = 400;
    throw error;
  }
  if (title.length > 200) {
    const error = new Error("Название блока слишком длинное.");
    error.statusCode = 400;
    throw error;
  }

  return {
    blockType: type,
    title,
    contentJson: dbJson.contentJson,
    configJson: dbJson.configJson,
    appearanceJson: dbJson.appearanceJson
  };
}

async function listForUser(userId) {
  const rows = await presentationsRepository.listForUser(userId);
  return rows.map(normalizePresentation);
}

async function create(userId, title) {
  const normalizedTitle = String(title || "").trim();
  if (!normalizedTitle) {
    const error = new Error("Название презентации обязательно");
    error.statusCode = 400;
    throw error;
  }
  if (normalizedTitle.length > 200) {
    const error = new Error("Название презентации слишком длинное");
    error.statusCode = 400;
    throw error;
  }

  const presentationId = await presentationsRepository.create({
    ownerUserId: userId,
    title: normalizedTitle
  });

  const presentation = await presentationsRepository.findByIdForUser({
    presentationId,
    userId
  });
  return normalizePresentation(presentation);
}

async function getByIdForUser({ presentationId, userId }) {
  const presentation = await presentationsRepository.findByIdForUser({
    presentationId,
    userId
  });
  if (!presentation) {
    return null;
  }
  return normalizePresentation(presentation);
}

async function deleteById({ presentationId, userId }) {
  return presentationsRepository.deleteOwnedById({
    presentationId,
    userId
  });
}

async function listBlocksForPresentation({ presentationId, userId }) {
  const presentation = await presentationsRepository.findByIdForUser({
    presentationId,
    userId
  });
  if (!presentation) {
    return null;
  }

  const rows = await presentationsRepository.listBlocksForPresentation({
    presentationId,
    userId
  });
  return rows.map(normalizePresentationBlockRow);
}

async function replaceBlocksForPresentation({ presentationId, userId, blocks }) {
  if (!Array.isArray(blocks)) {
    const error = new Error("Ожидается массив блоков");
    error.statusCode = 400;
    throw error;
  }
  if (blocks.length > 120) {
    const error = new Error("Слишком много блоков");
    error.statusCode = 400;
    throw error;
  }

  const normalizedBlocks = blocks.map((block, index) => {
    try {
      return normalizeInputBlock(block);
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error("Некорректные данные блока.");
      if (!wrapped.statusCode) {
        wrapped.statusCode = 400;
      }
      wrapped.message = `Блок #${index + 1}: ${wrapped.message}`;
      throw wrapped;
    }
  });

  const success = await presentationsRepository.replaceBlocksForPresentation({
    presentationId,
    userId,
    blocks: normalizedBlocks
  });

  if (!success) {
    return null;
  }

  const rows = await presentationsRepository.listBlocksForPresentation({
    presentationId,
    userId
  });
  return rows.map(normalizePresentationBlockRow);
}

module.exports = {
  listForUser,
  create,
  getByIdForUser,
  deleteById,
  listBlocksForPresentation,
  replaceBlocksForPresentation
};
