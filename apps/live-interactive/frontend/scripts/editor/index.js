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
const togglePreviewTopButton = document.getElementById("toggle-preview-top");
const openPreviewSideButton = document.getElementById("open-preview-side");
const closePreviewSideButton = document.getElementById("close-preview-side");

const addBlockModalNode = document.getElementById("add-block-modal");
const addBlockForm = document.getElementById("add-block-form");
const addBlockTypeLabel = document.getElementById("add-block-type-label");
const addBlockTitle = document.getElementById("add-block-title");
const addBlockNote = document.getElementById("add-block-note");
const closeAddModalButton = document.getElementById("close-add-modal");
const addModalBackdrop = addBlockModalNode.querySelector("[data-close-add-modal]");
let saveTimer = null;
let saveInFlight = false;
let saveQueued = false;
let saveEnabled = true;
let saveDisabledReasonShown = false;

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

function scheduleDraftSave() {
  if (!saveEnabled) {
    return;
  }
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(async () => {
    if (saveInFlight) {
      saveQueued = true;
      return;
    }

    saveInFlight = true;
    clearError();
    try {
      await syncDraftToServer();
    } catch (error) {
      showError(`Не удалось сохранить блоки в БД: ${error.message}`);
    } finally {
      saveInFlight = false;
      if (saveQueued) {
        saveQueued = false;
        scheduleDraftSave();
      }
    }
  }, 450);
}

const previewController = createPreviewController({
  layoutNode,
  previewNode,
  tvNode: tvPreviewNode,
  guestNode: guestPreviewNode,
  togglePreviewTopButton,
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
subscribeStateChanges(() => {
  scheduleDraftSave();
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

bootstrapEditor({
  appHeaderRoot,
  titleNode,
  metaNode,
  blockTypesMenuNode,
  onLogout: logout,
  onReady: ({ shouldMigrateLocalDraft, saveToDbAvailable, nonBlockingError } = {}) => {
    renderMainPanels();
    saveEnabled = true;
    if (nonBlockingError && !saveDisabledReasonShown) {
      showError(
        `Блоки БД недоступны (${nonBlockingError}). Редактор работает в локальном режиме.`
      );
      saveDisabledReasonShown = true;
    }
    if (shouldMigrateLocalDraft) {
      scheduleDraftSave();
    }
  }
}).catch((error) => showError(error.message));

