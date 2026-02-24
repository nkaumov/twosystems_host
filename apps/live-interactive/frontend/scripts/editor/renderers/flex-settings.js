import { applyPositionPickerState } from "../positioning.js";
import { appendBasicRows, createAccordion } from "./common.js";
import {
  createAdditionalEditor,
  createBackgroundEditor,
  createPositionPicker,
  createSizeAndPositionCard
} from "./visual-shared.js";

function createHeadingEditor({ headingKey, headingLabel, headingValue }) {
  const item = document.createElement("section");
  item.className = "heading-settings";

  const headingTitle = document.createElement("h4");
  headingTitle.textContent = headingLabel;
  item.appendChild(headingTitle);

  const textRow = document.createElement("label");
  textRow.className = "settings-row";
  const textLabel = document.createElement("span");
  textLabel.textContent = `${headingLabel} (текст)`;
  const textInput = document.createElement("input");
  textInput.className = "input";
  textInput.type = "text";
  textInput.maxLength = 250;
  textInput.value = headingValue.text;
  textInput.dataset.settingPath = `content.${headingKey}.text`;
  textRow.appendChild(textLabel);
  textRow.appendChild(textInput);

  const appearanceRow = document.createElement("div");
  appearanceRow.className = "heading-appearance-row";

  const colorRow = document.createElement("label");
  colorRow.className = "settings-row";
  const colorLabel = document.createElement("span");
  colorLabel.textContent = "Цвет";
  const colorInput = document.createElement("input");
  colorInput.className = "input color-input";
  colorInput.type = "color";
  colorInput.value = headingValue.color;
  colorInput.dataset.settingPath = `content.${headingKey}.color`;
  colorRow.appendChild(colorLabel);
  colorRow.appendChild(colorInput);

  const sizeRow = document.createElement("label");
  sizeRow.className = "settings-row";
  const sizeLabel = document.createElement("span");
  sizeLabel.textContent = "Размер, px";
  const sizeInput = document.createElement("input");
  sizeInput.className = "input";
  sizeInput.type = "number";
  sizeInput.min = "12";
  sizeInput.max = "240";
  sizeInput.step = "1";
  sizeInput.value = String(headingValue.size);
  sizeInput.dataset.settingPath = `content.${headingKey}.size`;
  sizeInput.dataset.valueType = "number";
  sizeRow.appendChild(sizeLabel);
  sizeRow.appendChild(sizeInput);

  appearanceRow.appendChild(colorRow);
  appearanceRow.appendChild(sizeRow);

  item.appendChild(textRow);
  item.appendChild(appearanceRow);
  item.appendChild(
    createPositionPicker({
      path: `content.${headingKey}.position`,
      selectedValue: headingValue.position
    })
  );

  return item;
}

function createMediaEditor(mediaSettings) {
  const section = document.createElement("section");
  section.className = "visual-settings";

  const enabledRow = document.createElement("label");
  enabledRow.className = "checkbox-row";
  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.checked = Boolean(mediaSettings.enabled);
  enabledInput.dataset.settingPath = "content.media.enabled";
  enabledInput.dataset.valueType = "boolean";
  const enabledText = document.createElement("span");
  enabledText.textContent = "Показывать медиа (фото/gif)";
  enabledRow.appendChild(enabledInput);
  enabledRow.appendChild(enabledText);
  section.appendChild(enabledRow);

  const controls = document.createElement("div");
  controls.className = "media-controls";
  controls.dataset.mediaControls = "1";
  controls.hidden = !mediaSettings.enabled;

  const uploadRow = document.createElement("label");
  uploadRow.className = "settings-row";
  const uploadLabel = document.createElement("span");
  uploadLabel.textContent = "Файл (фото или gif)";
  const uploadInput = document.createElement("input");
  uploadInput.className = "input";
  uploadInput.type = "file";
  uploadInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  uploadInput.dataset.fileUpload = "content.media";
  uploadInput.dataset.mediaUpload = "content.media";
  uploadRow.appendChild(uploadLabel);
  uploadRow.appendChild(uploadInput);

  const fileMeta = document.createElement("p");
  fileMeta.className = "media-file-meta";
  fileMeta.dataset.fileMeta = "content.media";
  fileMeta.textContent = mediaSettings.name
    ? `Текущий файл: ${mediaSettings.name}`
    : "Файл пока не выбран";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "btn btn-secondary";
  clearButton.textContent = "Очистить файл";
  clearButton.dataset.fileClear = "content.media";
  clearButton.dataset.mediaClear = "content.media";
  clearButton.hidden = !mediaSettings.src;

  controls.appendChild(uploadRow);
  controls.appendChild(fileMeta);
  controls.appendChild(clearButton);
  controls.appendChild(
    createSizeAndPositionCard({
      title: "Размещение медиа",
      sizeLabel: "Размер, % от экрана",
      sizePath: "content.media.size",
      sizeValue: mediaSettings.size,
      sizeMin: 8,
      sizeMax: 92,
      positionPath: "content.media.position",
      positionValue: mediaSettings.position
    })
  );

  section.appendChild(controls);
  return section;
}

export function renderFlexibleSettings({ titleNode, contentNode, selectedBlock, blockType }) {
  titleNode.textContent = `Настройки: ${selectedBlock.title}`;

  const settingsForm = document.createElement("form");
  settingsForm.className = "block-settings-form";

  const mainSection = createAccordion({
    key: "flex-main",
    title: "Основные"
  });
  const mainSectionBody = document.createElement("div");
  mainSectionBody.className = "settings-accordion-body";
  appendBasicRows({
    container: mainSectionBody,
    selectedBlock,
    blockType
  });

  const displayRow = document.createElement("label");
  displayRow.className = "settings-row";
  const displayLabel = document.createElement("span");
  displayLabel.textContent = "Где показывать этот слайд";
  const displaySelect = document.createElement("select");
  displaySelect.className = "input";
  displaySelect.dataset.settingPath = "main.displayTarget";

  const displayOptions = [
    { id: "tv_only", label: "Только ТВ" },
    { id: "tv_and_guest", label: "ТВ и гость" }
  ];
  const currentDisplayTarget = selectedBlock.settings?.main?.displayTarget || "tv_and_guest";
  for (const optionData of displayOptions) {
    const option = document.createElement("option");
    option.value = optionData.id;
    option.textContent = optionData.label;
    option.selected = optionData.id === currentDisplayTarget;
    displaySelect.appendChild(option);
  }
  displayRow.appendChild(displayLabel);
  displayRow.appendChild(displaySelect);
  mainSectionBody.appendChild(displayRow);
  mainSection.appendChild(mainSectionBody);

  const contentSection = createAccordion({
    key: "flex-content",
    title: "Содержимое"
  });
  const contentSectionBody = document.createElement("div");
  contentSectionBody.className = "settings-accordion-body";

  const contentTabs = document.createElement("div");
  contentTabs.className = "content-tabs";

  const tabList = document.createElement("div");
  tabList.className = "content-tab-list";

  const textTab = document.createElement("button");
  textTab.type = "button";
  textTab.className = "content-tab-btn active";
  textTab.textContent = "Текст";
  textTab.dataset.contentTabTarget = "text";
  tabList.appendChild(textTab);

  const mediaTab = document.createElement("button");
  mediaTab.type = "button";
  mediaTab.className = "content-tab-btn";
  mediaTab.textContent = "Медиа";
  mediaTab.dataset.contentTabTarget = "media";
  tabList.appendChild(mediaTab);

  const textPanel = document.createElement("div");
  textPanel.className = "content-tab-panel";
  textPanel.dataset.contentTab = "text";
  textPanel.appendChild(
    createHeadingEditor({
      headingKey: "h1",
      headingLabel: "Заголовок",
      headingValue: selectedBlock.settings.content.h1
    })
  );
  textPanel.appendChild(
    createHeadingEditor({
      headingKey: "p",
      headingLabel: "Основной текст",
      headingValue: selectedBlock.settings.content.p
    })
  );

  const mediaPanel = document.createElement("div");
  mediaPanel.className = "content-tab-panel";
  mediaPanel.dataset.contentTab = "media";
  mediaPanel.hidden = true;
  mediaPanel.appendChild(createMediaEditor(selectedBlock.settings.content.media));

  contentTabs.appendChild(tabList);
  contentTabs.appendChild(textPanel);
  contentTabs.appendChild(mediaPanel);
  contentSectionBody.appendChild(contentTabs);
  contentSection.appendChild(contentSectionBody);

  const visualSection = createAccordion({
    key: "flex-appearance",
    title: "Внешний вид"
  });
  const visualSectionBody = document.createElement("div");
  visualSectionBody.className = "settings-accordion-body";
  visualSectionBody.appendChild(createBackgroundEditor(selectedBlock.settings.appearance));
  visualSection.appendChild(visualSectionBody);

  const additionalSection = createAccordion({
    key: "flex-additional",
    title: "Дополнительно"
  });
  const additionalSectionBody = document.createElement("div");
  additionalSectionBody.className = "settings-accordion-body";
  additionalSectionBody.appendChild(createAdditionalEditor(selectedBlock.settings.additional));
  additionalSection.appendChild(additionalSectionBody);

  settingsForm.appendChild(mainSection);
  settingsForm.appendChild(contentSection);
  settingsForm.appendChild(visualSection);
  settingsForm.appendChild(additionalSection);
  contentNode.appendChild(settingsForm);

  if (!mainSection.open && !contentSection.open && !visualSection.open && !additionalSection.open) {
    mainSection.open = true;
  }

  const positionPickers = contentNode.querySelectorAll("[data-setting-drag-path]");
  for (const picker of positionPickers) {
    applyPositionPickerState(picker, picker.dataset.settingDragValue);
  }
}
