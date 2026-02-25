import { renderPreviewPanel } from "../renderer.js";
import { getSelectedBlock, setPreviewOpen, state, updateSelectedBlockSetting } from "../state.js";

export function createPreviewController({
  layoutNode,
  previewNode,
  tvNode,
  guestNode,
  togglePreviewTopButton,
  openPreviewSideButton,
  closePreviewSideButton
}) {
  function render() {
    renderPreviewPanel({
      layoutNode,
      previewNode,
      tvNode,
      guestNode,
      togglePreviewTopButton,
      openPreviewSideButton
    });
  }

  function open() {
    setPreviewOpen(true);
    render();
  }

  function close() {
    setPreviewOpen(false);
    render();
  }

  function toggle() {
    setPreviewOpen(!state.isPreviewOpen);
    render();
  }

  function handleEscape() {
    if (!state.isPreviewOpen) {
      return false;
    }
    close();
    return true;
  }

  function handlePreviewActionClick(event) {
    const actionButton = event.target.closest("[data-preview-action='quiz-step']");
    if (!actionButton) {
      return;
    }

    const selectedBlock = getSelectedBlock();
    if (!selectedBlock || selectedBlock.type !== "quiz") {
      return;
    }

    const questions = selectedBlock.settings?.content?.quiz?.questions;
    const questionsCount = Array.isArray(questions) ? questions.length : 0;
    const hasConnectionPage = Boolean(
      selectedBlock.settings?.additional?.connectionPage?.enabled
    );
    const slidesCount = questionsCount + (hasConnectionPage ? 1 : 0);
    if (slidesCount < 2) {
      return;
    }

    const step = Number(actionButton.dataset.previewStep || 0);
    if (Number.isNaN(step) || step === 0) {
      return;
    }

    const currentIndex = Number(selectedBlock.settings?.content?.previewQuestionIndex || 0);
    const safeCurrentIndex = Math.max(
      0,
      Math.min(slidesCount - 1, Number.isNaN(currentIndex) ? 0 : currentIndex)
    );
    const nextIndex = Math.max(
      0,
      Math.min(slidesCount - 1, safeCurrentIndex + Math.sign(step))
    );
    if (nextIndex === safeCurrentIndex) {
      return;
    }

    updateSelectedBlockSetting("content.previewQuestionIndex", nextIndex);
    render();
  }

  function bind() {
    if (togglePreviewTopButton) {
      togglePreviewTopButton.addEventListener("click", toggle);
    }
    openPreviewSideButton.addEventListener("click", open);
    closePreviewSideButton.addEventListener("click", close);
    previewNode.addEventListener("click", handlePreviewActionClick);
  }

  return {
    bind,
    render,
    handleEscape
  };
}
