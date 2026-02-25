import { getBlockTypeById } from "./block-types.js";
import { getSelectedBlock, state } from "./state.js";
import { createAccordion, createInfoText, formatStatus, appendBasicRows } from "./renderers/common.js";
import { renderFlexibleSettings } from "./renderers/flex-settings.js";
import { renderQuizSettings } from "./renderers/quiz-settings.js";
import { renderFlexiblePreview } from "./renderers/flex-preview.js?v=11";
import { renderQuizPreview } from "./renderers/quiz-preview.js?v=11";

export function renderPresentationMeta({ titleNode, metaNode }) {
  const presentation = state.presentation;
  if (!presentation) {
    titleNode.textContent = "Редактор";
    metaNode.textContent = "";
    return;
  }

  titleNode.textContent = presentation.title;
  metaNode.textContent = `Статус: ${formatStatus(presentation.status)} | Обновлено: ${new Date(
    presentation.updatedAt
  ).toLocaleString()}`;
}

export function renderBlockTypesMenu(menuNode, blockTypes) {
  menuNode.innerHTML = "";

  for (const item of blockTypes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary block-type-option";
    button.dataset.blockType = item.id;

    const icon = document.createElement("span");
    icon.className = "material-icons";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.icon;

    const text = document.createElement("span");
    text.textContent = item.label;

    button.appendChild(icon);
    button.appendChild(text);
    menuNode.appendChild(button);
  }
}

export function renderBlocksPanel({ listNode, emptyNode }) {
  listNode.innerHTML = "";

  if (!state.blocks.length) {
    emptyNode.hidden = false;
    return;
  }

  emptyNode.hidden = true;

  for (const block of state.blocks) {
    const blockType = getBlockTypeById(block.type);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "block-item";
    button.dataset.blockId = block.id;
    button.draggable = true;
    if (state.selectedBlockId === block.id) {
      button.classList.add("active");
    }

    const textWrap = document.createElement("span");

    const title = document.createElement("span");
    title.className = "block-item-title";
    title.textContent = block.title;

    const type = document.createElement("span");
    type.className = "block-item-type";
    type.textContent = blockType ? blockType.label : block.type;

    textWrap.appendChild(title);
    textWrap.appendChild(type);

    const dragIndicator = document.createElement("span");
    dragIndicator.className = "material-icons drag-indicator";
    dragIndicator.setAttribute("aria-hidden", "true");
    dragIndicator.textContent = "drag_indicator";

    button.appendChild(textWrap);
    button.appendChild(dragIndicator);
    listNode.appendChild(button);
  }
}

export function renderSettingsPanel({ titleNode, contentNode }) {
  const selectedBlock = getSelectedBlock();
  const quizCreateModal = document.querySelector("[data-quiz-create-modal='quiz-global']");
  quizCreateModal?.remove();
  const quizEditorModal = document.querySelector("[data-quiz-editor-modal='quiz-editor-global']");
  quizEditorModal?.remove();
  const quizClearModal = document.querySelector("[data-quiz-clear-modal='quiz-clear-global']");
  quizClearModal?.remove();
  contentNode.innerHTML = "";

  if (!selectedBlock) {
    titleNode.textContent = "Настройки блока";
    const placeholder = document.createElement("div");
    placeholder.className = "settings-placeholder";
    placeholder.textContent = "Добавьте блок и выберите его в списке слева.";
    contentNode.appendChild(placeholder);
    return;
  }

  const blockType = getBlockTypeById(selectedBlock.type);

  if (selectedBlock.type === "flex") {
    renderFlexibleSettings({
      titleNode,
      contentNode,
      selectedBlock,
      blockType
    });
    return;
  }

  if (selectedBlock.type === "quiz") {
    renderQuizSettings({
      titleNode,
      contentNode,
      selectedBlock,
      blockType
    });
    return;
  }

  titleNode.textContent = `Настройки: ${selectedBlock.title}`;
  const settingsForm = document.createElement("form");
  settingsForm.className = "block-settings-form";

  const mainSection = createAccordion({
    key: "common-main",
    title: "Основные"
  });
  const body = document.createElement("div");
  body.className = "settings-accordion-body";
  appendBasicRows({
    container: body,
    selectedBlock,
    blockType
  });
  const placeholder = document.createElement("div");
  placeholder.className = "settings-placeholder";
  placeholder.textContent = "Детальные настройки этого типа блока добавим на следующем этапе.";
  body.appendChild(placeholder);
  mainSection.appendChild(body);
  settingsForm.appendChild(mainSection);
  contentNode.appendChild(settingsForm);
  if (!mainSection.open) {
    mainSection.open = true;
  }
}

export function renderPreviewPanel({
  layoutNode,
  previewNode,
  tvNode,
  guestNode,
  togglePreviewTopButton,
  openPreviewSideButton
}) {
  layoutNode.classList.toggle("preview-open", state.isPreviewOpen);
  previewNode.setAttribute("aria-hidden", state.isPreviewOpen ? "false" : "true");
  openPreviewSideButton.hidden = state.isPreviewOpen;
  const quizNavNode = previewNode.querySelector("[data-preview-quiz-nav='1']");
  quizNavNode?.remove();

  if (togglePreviewTopButton) {
    togglePreviewTopButton.textContent = state.isPreviewOpen ? "Редактор" : "Предпросмотр";
    togglePreviewTopButton.classList.toggle("btn-primary", !state.isPreviewOpen);
    togglePreviewTopButton.classList.toggle("btn-secondary", state.isPreviewOpen);
  }

  const selectedBlock = getSelectedBlock();
  tvNode.innerHTML = "";
  guestNode.innerHTML = "";

  if (!selectedBlock) {
    const emptyTv = document.createElement("p");
    emptyTv.className = "preview-empty";
    emptyTv.textContent = "Выберите блок, чтобы увидеть ТВ-предпросмотр.";
    tvNode.appendChild(emptyTv);

    const emptyGuest = document.createElement("p");
    emptyGuest.className = "preview-empty";
    emptyGuest.textContent = "Выберите блок, чтобы увидеть экран гостя.";
    guestNode.appendChild(emptyGuest);
    return;
  }

  if (selectedBlock.type === "flex") {
    renderFlexiblePreview(tvNode, selectedBlock, "tv");
    renderFlexiblePreview(guestNode, selectedBlock, "guest");
    return;
  }

  if (selectedBlock.type === "quiz") {
    const questions = selectedBlock.settings?.content?.quiz?.questions;
    const questionsCount = Array.isArray(questions) ? questions.length : 0;
    const hasConnectionPage = Boolean(
      selectedBlock.settings?.additional?.connectionPage?.enabled
    );
    const slidesCount = questionsCount + (hasConnectionPage ? 1 : 0);
    if (slidesCount > 1) {
      const currentIndexRaw = Number(selectedBlock.settings?.content?.previewQuestionIndex || 0);
      const currentIndex = Math.max(
        0,
        Math.min(slidesCount - 1, Number.isNaN(currentIndexRaw) ? 0 : currentIndexRaw)
      );

      const nav = document.createElement("div");
      nav.className = "preview-quiz-nav";
      nav.dataset.previewQuizNav = "1";

      const prevButton = document.createElement("button");
      prevButton.type = "button";
      prevButton.className = "btn btn-secondary btn-icon quiz-preview-nav-btn";
      prevButton.dataset.previewAction = "quiz-step";
      prevButton.dataset.previewStep = "-1";
      prevButton.disabled = currentIndex <= 0;
      prevButton.title = "Предыдущий вопрос";
      prevButton.setAttribute("aria-label", "Предыдущий вопрос");
      const prevIcon = document.createElement("span");
      prevIcon.className = "material-icons";
      prevIcon.setAttribute("aria-hidden", "true");
      prevIcon.textContent = "chevron_left";
      prevButton.appendChild(prevIcon);
      nav.appendChild(prevButton);

      const label = document.createElement("span");
      label.className = "preview-quiz-nav-label";
      if (hasConnectionPage && currentIndex === 0) {
        label.textContent = `Страница подключения (1 из ${slidesCount})`;
      } else {
        const questionNumber = hasConnectionPage ? currentIndex : currentIndex + 1;
        label.textContent = `Вопрос ${questionNumber} из ${questionsCount}`;
      }
      nav.appendChild(label);

      const nextButton = document.createElement("button");
      nextButton.type = "button";
      nextButton.className = "btn btn-secondary btn-icon quiz-preview-nav-btn";
      nextButton.dataset.previewAction = "quiz-step";
      nextButton.dataset.previewStep = "1";
      nextButton.disabled = currentIndex >= slidesCount - 1;
      nextButton.title = "Следующий вопрос";
      nextButton.setAttribute("aria-label", "Следующий вопрос");
      const nextIcon = document.createElement("span");
      nextIcon.className = "material-icons";
      nextIcon.setAttribute("aria-hidden", "true");
      nextIcon.textContent = "chevron_right";
      nextButton.appendChild(nextIcon);
      nav.appendChild(nextButton);

      previewNode.appendChild(nav);
    }

    renderQuizPreview(tvNode, selectedBlock, "tv");
    renderQuizPreview(guestNode, selectedBlock, "guest");
    return;
  }

  const blockType = getBlockTypeById(selectedBlock.type);
  const typeLabel = blockType ? blockType.label : selectedBlock.type;
  const infoText = createInfoText(selectedBlock, blockType || { label: selectedBlock.type });

  const tvTitle = document.createElement("h4");
  tvTitle.className = "preview-title";
  tvTitle.textContent = selectedBlock.title;
  const tvType = document.createElement("p");
  tvType.className = "preview-type";
  tvType.textContent = `Тип: ${typeLabel}`;
  const tvNote = document.createElement("p");
  tvNote.className = "preview-note";
  tvNote.textContent = infoText;
  tvNode.appendChild(tvTitle);
  tvNode.appendChild(tvType);
  tvNode.appendChild(tvNote);

  const guestTitle = document.createElement("h4");
  guestTitle.className = "preview-title";
  guestTitle.textContent = typeLabel;
  const guestNote = document.createElement("p");
  guestNote.className = "preview-note";
  guestNote.textContent = selectedBlock.note || "Гость увидит интерактив после запуска блока.";
  guestNode.appendChild(guestTitle);
  guestNode.appendChild(guestNote);
}
