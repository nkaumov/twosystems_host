import { hideWithMotion, isMotionOpen, showWithMotion } from "../../shared/motion.js";
import { getBlockTypeById } from "../block-types.js";
import { addBlock, state } from "../state.js";

export function createAddBlockController({
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
  onChanged
}) {
  let pendingAddType = null;

  function closeBlockTypesMenu() {
    hideWithMotion(blockTypesMenuNode, { durationMs: 170 });
  }

  function toggleBlockTypesMenu() {
    if (isMotionOpen(blockTypesMenuNode)) {
      closeBlockTypesMenu();
      return;
    }
    showWithMotion(blockTypesMenuNode);
  }

  function buildSuggestedTitle(typeId) {
    const type = getBlockTypeById(typeId);
    if (!type) {
      return "Новый блок";
    }
    const currentCount = state.blocks.filter((item) => item.type === typeId).length;
    return `${type.label} ${currentCount + 1}`;
  }

  function openAddBlockModal(typeId) {
    pendingAddType = typeId;
    const type = getBlockTypeById(typeId);
    addBlockTypeLabel.value = type ? type.label : typeId;
    addBlockTitle.value = buildSuggestedTitle(typeId);
    addBlockNote.value = "";
    addBlockModalNode.hidden = false;
    window.setTimeout(() => {
      addBlockTitle.focus();
      addBlockTitle.select();
    }, 0);
  }

  function closeAddBlockModal() {
    pendingAddType = null;
    addBlockForm.reset();
    addBlockModalNode.hidden = true;
  }

  function handleEscape() {
    if (!addBlockModalNode.hidden) {
      closeAddBlockModal();
      return true;
    }
    if (!blockTypesMenuNode.hidden) {
      closeBlockTypesMenu();
      return true;
    }
    return false;
  }

  function bind() {
    openBlockTypesButton.addEventListener("click", () => {
      clearError();
      toggleBlockTypesMenu();
    });

    blockTypesMenuNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-block-type]");
      if (!button) {
        return;
      }
      const typeId = button.dataset.blockType;
      closeBlockTypesMenu();
      openAddBlockModal(typeId);
    });

    document.addEventListener("click", (event) => {
      if (blockTypesMenuNode.hidden) {
        return;
      }
      const clickInsideMenu = blockTypesMenuNode.contains(event.target);
      const clickOnToggle = openBlockTypesButton.contains(event.target);
      if (!clickInsideMenu && !clickOnToggle) {
        closeBlockTypesMenu();
      }
    });

    addBlockForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearError();

      if (!pendingAddType) {
        showError("Не выбран тип блока");
        return;
      }

      const title = String(addBlockTitle.value || "").trim();
      if (!title) {
        showError("Введите название блока");
        addBlockTitle.focus();
        return;
      }

      addBlock({
        type: pendingAddType,
        title,
        note: String(addBlockNote.value || "")
      });
      closeAddBlockModal();
      onChanged();
    });

    closeAddModalButton.addEventListener("click", closeAddBlockModal);
    addModalBackdrop.addEventListener("click", closeAddBlockModal);
  }

  return {
    bind,
    handleEscape
  };
}
