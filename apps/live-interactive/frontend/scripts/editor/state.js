import {
  createDefaultFlexibleSettings,
  normalizeFlexibleSettings
} from "./flexible-block.js";
import { createDefaultQuizSettings, normalizeQuizSettings } from "./quiz-block.js";
import { getEditorBlockSchemaEntry } from "./schemas/registry.js";

const STORAGE_PREFIX = "li_editor_blocks_";
const changeListeners = new Set();
const DEFAULT_SCHEMA_VERSION = 1;
const DEFAULT_TYPE_VERSION = 1;

export const state = {
  presentation: null,
  blocks: [],
  selectedBlockId: null,
  isPreviewOpen: false
};

let nextLocalId = 1;

function buildStorageKey() {
  if (!state.presentation?.id) {
    return null;
  }
  return `${STORAGE_PREFIX}${state.presentation.id}`;
}

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }
  return text;
}

function normalizePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function resolveBlockVersionDefaults(type) {
  const schemaEntry = getEditorBlockSchemaEntry(type);
  const schema = schemaEntry?.schema || {};
  return {
    schemaVersion: normalizePositiveInt(schema?.schemaVersion, DEFAULT_SCHEMA_VERSION),
    typeVersion: normalizePositiveInt(schema?.typeVersion, DEFAULT_TYPE_VERSION)
  };
}

function applyVersionDefaults(versionTarget, type) {
  if (!versionTarget || typeof versionTarget !== "object") {
    return;
  }
  const defaults = resolveBlockVersionDefaults(type);
  versionTarget.schemaVersion = defaults.schemaVersion;
  versionTarget.typeVersion = defaults.typeVersion;
}

function createDefaultSettingsByType(type, versionTarget = null) {
  applyVersionDefaults(versionTarget, type);
  if (type === "flex") {
    return createDefaultFlexibleSettings();
  }
  if (type === "quiz") {
    return createDefaultQuizSettings();
  }
  return {};
}

function normalizeSettingsByType(type, rawSettings, versionTarget = null) {
  applyVersionDefaults(versionTarget, type);
  if (type === "flex") {
    return normalizeFlexibleSettings(rawSettings);
  }
  if (type === "quiz") {
    return normalizeQuizSettings(rawSettings);
  }
  if (!rawSettings || typeof rawSettings !== "object" || Array.isArray(rawSettings)) {
    return {};
  }
  return rawSettings;
}

function setByPath(target, path, value) {
  const keys = String(path || "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!keys.length) {
    return;
  }

  let cursor = target;
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const isLast = index === keys.length - 1;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    const nextValue = cursor[key];
    if (!nextValue || typeof nextValue !== "object" || Array.isArray(nextValue)) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
}

function normalizeBlock(rawBlock) {
  const id = String(rawBlock?.id || "");
  const type = String(rawBlock?.type || "");
  const title = normalizeText(rawBlock?.title, "Новый блок");
  const note = String(rawBlock?.note || "").trim();
  const createdAt = rawBlock?.createdAt || new Date().toISOString();
  if (!id || !type) {
    return null;
  }
  const versionDefaults = {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    typeVersion: DEFAULT_TYPE_VERSION
  };
  const settings = normalizeSettingsByType(type, rawBlock?.settings, versionDefaults);
  return {
    id,
    type,
    title,
    note,
    createdAt,
    schemaVersion: normalizePositiveInt(rawBlock?.schemaVersion, versionDefaults.schemaVersion),
    typeVersion: normalizePositiveInt(rawBlock?.typeVersion, versionDefaults.typeVersion),
    settings
  };
}

function updateNextIdCounter() {
  const usedNumbers = state.blocks
    .map((item) => Number(String(item.id).replace(/^b/, "")))
    .filter((value) => !Number.isNaN(value) && value > 0);
  const maxNumber = usedNumbers.length ? Math.max(...usedNumbers) : 0;
  nextLocalId = maxNumber + 1;
}

function persistDraft() {
  const storageKey = buildStorageKey();
  if (!storageKey) {
    return;
  }
  const payload = {
    blocks: state.blocks,
    selectedBlockId: state.selectedBlockId
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

function emitChange() {
  for (const listener of changeListeners) {
    try {
      listener();
    } catch {
      // ignore listeners errors to keep editor state stable
    }
  }
}

export function setPresentationContext(presentation) {
  state.presentation = presentation;
}

export function hydrateDraft() {
  const storageKey = buildStorageKey();
  if (!storageKey) {
    return;
  }
  const rawPayload = window.localStorage.getItem(storageKey);
  if (!rawPayload) {
    state.blocks = [];
    state.selectedBlockId = null;
    nextLocalId = 1;
    return;
  }

  try {
    const parsed = JSON.parse(rawPayload);
    const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    state.blocks = blocks.map(normalizeBlock).filter(Boolean);
    const selectedBlockId = String(parsed?.selectedBlockId || "");
    const hasSelected = state.blocks.some((item) => item.id === selectedBlockId);
    state.selectedBlockId = hasSelected ? selectedBlockId : state.blocks[0]?.id || null;
    updateNextIdCounter();
  } catch {
    state.blocks = [];
    state.selectedBlockId = null;
    nextLocalId = 1;
  }
}

export function replaceDraft({ blocks, selectedBlockId = null }) {
  const normalizedBlocks = Array.isArray(blocks) ? blocks.map(normalizeBlock).filter(Boolean) : [];
  state.blocks = normalizedBlocks;

  const normalizedSelected = String(selectedBlockId || "");
  const hasSelected = normalizedBlocks.some((item) => item.id === normalizedSelected);
  state.selectedBlockId = hasSelected ? normalizedSelected : normalizedBlocks[0]?.id || null;

  updateNextIdCounter();
  persistDraft();
  emitChange();
}

export function selectBlock(blockId) {
  const normalizedId = String(blockId || "");
  const exists = state.blocks.some((item) => item.id === normalizedId);
  if (!exists) {
    return;
  }
  state.selectedBlockId = normalizedId;
  persistDraft();
  emitChange();
}

export function addBlock({ type, title, note }) {
  const normalizedType = String(type || "").trim();
  const versionDefaults = {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    typeVersion: DEFAULT_TYPE_VERSION
  };
  const block = {
    id: `b${nextLocalId++}`,
    type: normalizedType,
    title: normalizeText(title, "Новый блок"),
    note: String(note || "").trim(),
    createdAt: new Date().toISOString(),
    schemaVersion: versionDefaults.schemaVersion,
    typeVersion: versionDefaults.typeVersion,
    settings: createDefaultSettingsByType(normalizedType, versionDefaults)
  };

  state.blocks = [...state.blocks, block];
  state.selectedBlockId = block.id;
  persistDraft();
  emitChange();
  return block;
}

export function updateSelectedBlock(patch) {
  if (!state.selectedBlockId) {
    return;
  }
  state.blocks = state.blocks.map((item) => {
    if (item.id !== state.selectedBlockId) {
      return item;
    }
    const nextType = String(patch?.type ?? item.type ?? "").trim() || item.type;
    const versionDefaults = resolveBlockVersionDefaults(nextType);
    return {
      ...item,
      ...patch,
      type: nextType,
      title: normalizeText(
        patch?.title ?? item.title,
        "\u041d\u043e\u0432\u044b\u0439 \u0431\u043b\u043e\u043a"
      ),
      note: String(patch?.note ?? (item.note || "")).trim(),
      schemaVersion: normalizePositiveInt(
        patch?.schemaVersion ?? item.schemaVersion,
        versionDefaults.schemaVersion
      ),
      typeVersion: normalizePositiveInt(
        patch?.typeVersion ?? item.typeVersion,
        versionDefaults.typeVersion
      ),
      settings: normalizeSettingsByType(nextType, patch?.settings ?? item.settings, versionDefaults)
    };
  });
  persistDraft();
  emitChange();
}

export function updateSelectedBlockSetting(path, value) {
  if (!state.selectedBlockId) {
    return;
  }

  state.blocks = state.blocks.map((item) => {
    if (item.id !== state.selectedBlockId) {
      return item;
    }
    const nextSettings = JSON.parse(JSON.stringify(item.settings || {}));
    setByPath(nextSettings, path, value);
    return {
      ...item,
      settings: normalizeSettingsByType(item.type, nextSettings)
    };
  });

  persistDraft();
  emitChange();
}

export function setBlocksOrder(orderedIds) {
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    return;
  }

  const uniqueIds = [];
  const seen = new Set();
  for (const id of orderedIds.map((value) => String(value || ""))) {
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    uniqueIds.push(id);
  }

  const byId = new Map(state.blocks.map((item) => [item.id, item]));
  const ordered = uniqueIds.map((id) => byId.get(id)).filter(Boolean);
  if (ordered.length !== state.blocks.length) {
    const orderedSet = new Set(ordered.map((item) => item.id));
    for (const block of state.blocks) {
      if (!orderedSet.has(block.id)) {
        ordered.push(block);
      }
    }
  }

  state.blocks = ordered;
  persistDraft();
  emitChange();
}

export function setPreviewOpen(isOpen) {
  state.isPreviewOpen = Boolean(isOpen);
}

export function getSelectedBlock() {
  if (!state.selectedBlockId) {
    return null;
  }
  return state.blocks.find((item) => item.id === state.selectedBlockId) || null;
}

export function getDraftSnapshot() {
  return {
    blocks: JSON.parse(JSON.stringify(state.blocks || [])),
    selectedBlockId: state.selectedBlockId
  };
}

export function subscribeStateChanges(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function getBlocksSnapshot() {
  return JSON.parse(JSON.stringify(state.blocks || []));
}

export function getPresentationId() {
  return Number(state.presentation?.id || 0) || null;
}
