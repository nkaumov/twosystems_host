import { apiRequest } from "../shared/api.js?v=2";
import { requireSession } from "../shared/session.js";
import { renderBlocksPanel, renderSettingsPanel } from "./renderer.js?v=10";
import { createAddBlockController } from "./controllers/add-block-controller.js";
import { bootstrapEditor } from "./controllers/bootstrap-controller.js";
import { createBlocksController } from "./controllers/blocks-controller.js";
import { createPreviewController } from "./controllers/preview-controller.js";
import { createSettingsController } from "./controllers/settings-controller.js";
import {
  getDraftSnapshot,
  getPresentationId,
  subscribeStateChanges
} from "./state.js";

const titleNode = document.getElementById("editor-title");
const metaNode = document.getElementById("editor-meta");
const errorNode = document.getElementById("editor-error");
const appHeaderRoot = document.getElementById("app-header-root");
const backButton = document.getElementById("editor-back");

const layoutNode = document.getElementById("editor-layout");
const blocksListNode = document.getElementById("editor-blocks-list");
const blocksEmptyNode = document.getElementById("editor-blocks-empty");
const settingsTitleNode = document.getElementById("settings-title");
const settingsContentNode = document.getElementById("editor-settings-content");
const tvPreviewNode = document.getElementById("tv-preview-content");
const guestPreviewNode = document.getElementById("guest-preview-content");
const previewNode = document.getElementById("editor-preview");

const openBlockTypesButton = document.getElementById("open-block-types");
const blockTypesMenuNode = document.getElementById("block-types-menu");
const liveButtonNode = document.getElementById("editor-live");
const saveButtonNode = document.getElementById("editor-save");
const dirtyIndicatorNode = document.getElementById("editor-dirty-indicator");
const saveStatusNode = document.getElementById("editor-save-status");
const openPreviewSideButton = document.getElementById("open-preview-side");
const closePreviewSideButton = document.getElementById("close-preview-side");

const addBlockModalNode = document.getElementById("add-block-modal");
const addBlockForm = document.getElementById("add-block-form");
const addBlockTypeLabel = document.getElementById("add-block-type-label");
const addBlockTitle = document.getElementById("add-block-title");
const addBlockNote = document.getElementById("add-block-note");
const closeAddModalButton = document.getElementById("close-add-modal");
const addModalBackdrop = addBlockModalNode.querySelector("[data-close-add-modal]");
let saveInFlight = false;
let saveToDbAvailable = true;
let saveDisabledReasonShown = false;
let isDirty = false;
let dirtyTrackingEnabled = false;
let saveStatusTimer = null;
let changedWhileSaving = false;

function showError(message) {
  errorNode.textContent = message;
  errorNode.hidden = false;
}

function clearError() {
  errorNode.hidden = true;
  errorNode.textContent = "";
}

async function syncDraftToServer() {
  const presentationId = getPresentationId();
  if (!presentationId) {
    return;
  }
  const snapshot = getDraftSnapshot();
  await apiRequest(`/api/presentations/${presentationId}/blocks`, {
    method: "PUT",
    body: JSON.stringify({
      blocks: snapshot.blocks
    })
  });
}

function clearSaveStatus() {
  if (!saveStatusNode) {
    return;
  }
  if (saveStatusTimer) {
    window.clearTimeout(saveStatusTimer);
    saveStatusTimer = null;
  }
  saveStatusNode.hidden = true;
  saveStatusNode.textContent = "";
}

function showSaveStatus(message, { timeoutMs = 0 } = {}) {
  if (!saveStatusNode) {
    return;
  }
  if (saveStatusTimer) {
    window.clearTimeout(saveStatusTimer);
    saveStatusTimer = null;
  }
  saveStatusNode.hidden = false;
  saveStatusNode.textContent = message;
  if (timeoutMs > 0) {
    saveStatusTimer = window.setTimeout(() => {
      clearSaveStatus();
    }, timeoutMs);
  }
}

function renderSaveControls() {
  if (dirtyIndicatorNode) {
    dirtyIndicatorNode.hidden = !isDirty;
  }
  if (saveButtonNode) {
    saveButtonNode.disabled = saveInFlight || !saveToDbAvailable || !isDirty;
  }
}

function setDirty(nextValue) {
  isDirty = Boolean(nextValue);
  renderSaveControls();
}

async function saveToDatabase() {
  if (!saveToDbAvailable) {
    showError("Сохранение в БД недоступно.");
    return;
  }
  if (!isDirty || saveInFlight) {
    return;
  }

  saveInFlight = true;
  changedWhileSaving = false;
  renderSaveControls();
  clearError();
  clearSaveStatus();
  try {
    await syncDraftToServer();
    if (changedWhileSaving) {
      setDirty(true);
      showSaveStatus("Сохранено. Есть новые изменения.", { timeoutMs: 1800 });
    } else {
      setDirty(false);
      showSaveStatus("Сохранено", { timeoutMs: 1600 });
    }
  } catch (error) {
    showError(`Не удалось сохранить блоки в БД: ${error.message}`);
  } finally {
    saveInFlight = false;
    renderSaveControls();
  }
}

function resolveLiveUrl() {
  const explicitUrl = String(liveButtonNode?.dataset?.liveUrl || "").trim();
  if (explicitUrl) {
    return explicitUrl;
  }
  const presentationId = getPresentationId();
  if (!presentationId) {
    return "";
  }
  return `/presentations/${presentationId}/live`;
}

function navigateToLive() {
  const liveUrl = resolveLiveUrl();
  if (!liveUrl) {
    showError("Не удалось определить маршрут Live.");
    return;
  }
  window.location.href = liveUrl;
}

async function handleStartLiveClick(event) {
  event?.preventDefault();

  if (saveInFlight) {
    showSaveStatus("Сначала дождитесь сохранения.", { timeoutMs: 1700 });
    return;
  }

  if (!saveToDbAvailable) {
    showError("Live недоступен в локальном режиме. Подключите БД и сохраните презентацию.");
    return;
  }

  if (!isDirty) {
    navigateToLive();
    return;
  }

  const shouldSaveAndLaunch = window.confirm(
    "Есть несохранённые изменения. Сохранить и запустить?"
  );
  if (!shouldSaveAndLaunch) {
    return;
  }

  await saveToDatabase();
  if (isDirty) {
    return;
  }
  navigateToLive();
}

const previewController = createPreviewController({
  layoutNode,
  previewNode,
  tvNode: tvPreviewNode,
  guestNode: guestPreviewNode,
  togglePreviewTopButton: null,
  openPreviewSideButton,
  closePreviewSideButton
});

function renderBlocks() {
  renderBlocksPanel({
    listNode: blocksListNode,
    emptyNode: blocksEmptyNode
  });
}

function renderPreview() {
  previewController.render();
}

const settingsController = createSettingsController({
  settingsContentNode,
  renderBlocks,
  renderPreview,
  renderAll: renderMainPanels,
  showError,
  clearError
});

function renderMainPanels() {
  renderBlocks();
  renderSettingsPanel({
    titleNode: settingsTitleNode,
    contentNode: settingsContentNode
  });
  renderPreview();
  settingsController.syncBackgroundSectionUi();
  settingsController.syncToggleDependentSections();
  settingsController.switchContentTab("text");
}

const addBlockController = createAddBlockController({
  openBlockTypesButton,
  blockTypesMenuNode,
  addBlockModalNode,
  addBlockForm,
  addBlockTypeLabel,
  addBlockTitle,
  addBlockNote,
  closeAddModalButton,
  addModalBackdrop,
  showError,
  clearError,
  onChanged: renderMainPanels
});

const blocksController = createBlocksController({
  listNode: blocksListNode,
  onChanged: renderMainPanels
});

async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.replace("/login");
  }
}

backButton.addEventListener("click", () => {
  window.location.href = "/presentations";
});

settingsController.bind();
previewController.bind();
addBlockController.bind();
blocksController.bind();
saveButtonNode?.addEventListener("click", () => {
  saveToDatabase();
});
liveButtonNode?.addEventListener("click", (event) => {
  handleStartLiveClick(event);
});
renderSaveControls();
subscribeStateChanges(() => {
  if (!dirtyTrackingEnabled) {
    return;
  }
  if (saveInFlight) {
    changedWhileSaving = true;
  }
  setDirty(true);
  clearSaveStatus();
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (settingsController.handleEscape()) {
    return;
  }
  if (addBlockController.handleEscape()) {
    return;
  }
  previewController.handleEscape();
});

window.addEventListener("pageshow", () => {
  requireSession().catch(() => null);
});

window.addEventListener("resize", () => {
  previewController.render();
});

window.addEventListener("beforeunload", (event) => {
  if (!isDirty) {
    return;
  }
  event.preventDefault();
  event.returnValue = "";
});

bootstrapEditor({
  appHeaderRoot,
  titleNode,
  metaNode,
  blockTypesMenuNode,
  onLogout: logout,
  onReady: ({ shouldMigrateLocalDraft, saveToDbAvailable: canSaveToDb, nonBlockingError } = {}) => {
    renderMainPanels();
    saveToDbAvailable = Boolean(canSaveToDb);
    dirtyTrackingEnabled = true;
    setDirty(Boolean(shouldMigrateLocalDraft));
    renderSaveControls();
    if (nonBlockingError && !saveDisabledReasonShown) {
      showError(
        `Блоки БД недоступны (${nonBlockingError}). Редактор работает в локальном режиме.`
      );
      saveDisabledReasonShown = true;
    }
    if (shouldMigrateLocalDraft) {
      showSaveStatus("Есть локальные изменения - нажмите Сохранить, чтобы записать в БД.");
    } else {
      clearSaveStatus();
    }
  }
}).catch((error) => showError(error.message));

