export function formatStatus(status) {
  const statusMap = {
    draft: "Черновик",
    ready: "Готово",
    archived: "Архив"
  };
  return statusMap[status] || status;
}

export function createInfoText(block, blockType) {
  if (block.note) {
    return block.note;
  }
  return `Описание для блока "${blockType.label}" пока не задано.`;
}

export function createAccordion({ key, title }) {
  const details = document.createElement("details");
  details.className = "settings-accordion";
  details.dataset.accordionKey = key;

  const summary = document.createElement("summary");
  summary.textContent = title;
  details.appendChild(summary);

  return details;
}

export function appendBasicRows({ container, selectedBlock, blockType }) {
  const typeRow = document.createElement("label");
  typeRow.className = "settings-row";
  const typeLabel = document.createElement("span");
  typeLabel.textContent = "Тип блока";
  const typeInput = document.createElement("input");
  typeInput.className = "input";
  typeInput.type = "text";
  typeInput.value = blockType ? blockType.label : selectedBlock.type;
  typeInput.readOnly = true;
  typeRow.appendChild(typeLabel);
  typeRow.appendChild(typeInput);

  const titleRow = document.createElement("label");
  titleRow.className = "settings-row";
  const titleLabel = document.createElement("span");
  titleLabel.textContent = "Название блока";
  const titleInput = document.createElement("input");
  titleInput.className = "input";
  titleInput.type = "text";
  titleInput.value = selectedBlock.title;
  titleInput.maxLength = 120;
  titleInput.dataset.settingField = "title";
  titleRow.appendChild(titleLabel);
  titleRow.appendChild(titleInput);

  const noteRow = document.createElement("label");
  noteRow.className = "settings-row";
  const noteLabel = document.createElement("span");
  noteLabel.textContent = "Описание / заметка";
  const noteInput = document.createElement("textarea");
  noteInput.className = "input";
  noteInput.rows = 3;
  noteInput.maxLength = 800;
  noteInput.value = selectedBlock.note;
  noteInput.dataset.settingField = "note";
  noteRow.appendChild(noteLabel);
  noteRow.appendChild(noteInput);

  container.appendChild(typeRow);
  container.appendChild(titleRow);
  container.appendChild(noteRow);
}
