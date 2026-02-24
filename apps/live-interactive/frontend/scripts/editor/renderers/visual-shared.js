import { FLEX_POSITION_OPTIONS } from "../flexible-block.js";

export function createPositionPicker({ path, selectedValue }) {
  const wrapper = document.createElement("div");
  wrapper.className = "position-picker";

  const hint = document.createElement("p");
  hint.className = "position-picker-hint";
  hint.textContent = "Положение";
  wrapper.appendChild(hint);

  const panel = document.createElement("div");
  panel.className = "position-drag-picker";
  panel.dataset.settingDragPath = path;
  panel.dataset.settingDragValue = selectedValue;

  for (const option of FLEX_POSITION_OPTIONS) {
    const dot = document.createElement("span");
    dot.className = "position-grid-dot";
    dot.title = option.label;
    dot.setAttribute("aria-hidden", "true");
    dot.dataset.positionDot = option.id;
    panel.appendChild(dot);
  }

  const marker = document.createElement("span");
  marker.className = "position-drag-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.dataset.positionMarker = "1";
  panel.appendChild(marker);

  wrapper.appendChild(panel);
  return wrapper;
}

export function createSizeAndPositionCard({
  title,
  sizeLabel,
  sizePath,
  sizeValue,
  sizeMin,
  sizeMax,
  positionPath,
  positionValue
}) {
  const card = document.createElement("section");
  card.className = "heading-settings";

  const heading = document.createElement("h4");
  heading.textContent = title;
  card.appendChild(heading);

  const sizeRow = document.createElement("label");
  sizeRow.className = "settings-row";
  const sizeTitle = document.createElement("span");
  sizeTitle.textContent = sizeLabel;
  const sizeInput = document.createElement("input");
  sizeInput.className = "input";
  sizeInput.type = "number";
  sizeInput.min = String(sizeMin);
  sizeInput.max = String(sizeMax);
  sizeInput.step = "1";
  sizeInput.value = String(sizeValue);
  sizeInput.dataset.settingPath = sizePath;
  sizeInput.dataset.valueType = "number";
  sizeRow.appendChild(sizeTitle);
  sizeRow.appendChild(sizeInput);
  card.appendChild(sizeRow);

  card.appendChild(
    createPositionPicker({
      path: positionPath,
      selectedValue: positionValue
    })
  );

  return card;
}

export function createAdditionalEditor(additionalSettings, options = {}) {
  const { includeConnectionPage = false } = options;
  const section = document.createElement("section");
  section.className = "visual-settings";

  if (includeConnectionPage) {
    const connectionRow = document.createElement("label");
    connectionRow.className = "checkbox-row";
    const connectionInput = document.createElement("input");
    connectionInput.type = "checkbox";
    connectionInput.checked = Boolean(additionalSettings?.connectionPage?.enabled);
    connectionInput.dataset.settingPath = "additional.connectionPage.enabled";
    connectionInput.dataset.valueType = "boolean";
    const connectionText = document.createElement("span");
    connectionText.textContent = "Страница для подключения";
    connectionRow.appendChild(connectionInput);
    connectionRow.appendChild(connectionText);
    section.appendChild(connectionRow);

    const connectionControls = document.createElement("div");
    connectionControls.className = "media-controls";
    connectionControls.dataset.connectionPageControls = "1";
    connectionControls.hidden = !additionalSettings?.connectionPage?.enabled;

    const qrSizeRow = document.createElement("label");
    qrSizeRow.className = "settings-row";
    const qrSizeLabel = document.createElement("span");
    qrSizeLabel.textContent = "Размер QR-code на странице подключения, %";
    const qrSizeInput = document.createElement("input");
    qrSizeInput.className = "input";
    qrSizeInput.type = "number";
    qrSizeInput.min = "12";
    qrSizeInput.max = "82";
    qrSizeInput.step = "1";
    qrSizeInput.value = String(additionalSettings?.connectionPage?.qrSize || 36);
    qrSizeInput.dataset.settingPath = "additional.connectionPage.qrSize";
    qrSizeInput.dataset.valueType = "number";
    qrSizeRow.appendChild(qrSizeLabel);
    qrSizeRow.appendChild(qrSizeInput);
    connectionControls.appendChild(qrSizeRow);

    const connectionHint = document.createElement("p");
    connectionHint.className = "media-file-meta";
    connectionHint.textContent =
      "В предпросмотре количество подключенных показывается как N. В live-сессии здесь будет реальное число.";
    connectionControls.appendChild(connectionHint);
    section.appendChild(connectionControls);
  }

  const qrRow = document.createElement("label");
  qrRow.className = "checkbox-row";
  const qrInput = document.createElement("input");
  qrInput.type = "checkbox";
  qrInput.checked = Boolean(additionalSettings.showQr);
  qrInput.dataset.settingPath = "additional.showQr";
  qrInput.dataset.valueType = "boolean";
  const qrText = document.createElement("span");
  qrText.textContent = "Показать qr-code подключения (только для ТВ)";
  qrRow.appendChild(qrInput);
  qrRow.appendChild(qrText);
  section.appendChild(qrRow);

  const controls = document.createElement("div");
  controls.className = "media-controls";
  controls.dataset.qrControls = "1";
  controls.hidden = !additionalSettings.showQr;
  controls.appendChild(
    createSizeAndPositionCard({
      title: "Параметры qr-code",
      sizeLabel: "Размер, % от экрана",
      sizePath: "additional.qrSize",
      sizeValue: additionalSettings.qrSize,
      sizeMin: 8,
      sizeMax: 60,
      positionPath: "additional.qrPosition",
      positionValue: additionalSettings.qrPosition
    })
  );
  section.appendChild(controls);

  return section;
}

export function createInteractiveAnswersEditor(appearanceSettings, options = {}) {
  const { displayTarget = "tv_and_guest" } = options;
  const section = document.createElement("section");
  section.className = "heading-settings";
  section.dataset.interactiveOnlyControls = "1";
  section.hidden = displayTarget !== "tv_and_guest";

  const title = document.createElement("h4");
  title.textContent = "Ответы гостей в эфире";
  section.appendChild(title);

  const hint = document.createElement("p");
  hint.className = "media-file-meta";
  hint.textContent =
    "Настройки работают только для режима «ТВ и гость» (интерактив). В режиме «Только ТВ» ответы гостей не выводятся.";
  section.appendChild(hint);

  const choiceRow = document.createElement("label");
  choiceRow.className = "settings-row";
  const choiceLabel = document.createElement("span");
  choiceLabel.textContent = "Вопросы с выбором";
  const choiceSelect = document.createElement("select");
  choiceSelect.className = "input";
  choiceSelect.dataset.settingPath = "appearance.choiceAnswersView";
  const choiceOptions = [
    { id: "chart", label: "Диаграмма" },
    { id: "pie", label: "Круговая диаграмма" }
  ];
  for (const optionData of choiceOptions) {
    const option = document.createElement("option");
    option.value = optionData.id;
    option.textContent = optionData.label;
    option.selected = optionData.id === appearanceSettings?.choiceAnswersView;
    choiceSelect.appendChild(option);
  }
  choiceRow.appendChild(choiceLabel);
  choiceRow.appendChild(choiceSelect);
  section.appendChild(choiceRow);

  const textRow = document.createElement("label");
  textRow.className = "settings-row";
  const textLabel = document.createElement("span");
  textLabel.textContent = "Текстовые ответы";
  const textSelect = document.createElement("select");
  textSelect.className = "input";
  textSelect.dataset.settingPath = "appearance.textAnswersView";
  const textOptions = [
    { id: "cloud", label: "Облако ответов" },
    { id: "pile", label: "Куча" }
  ];
  for (const optionData of textOptions) {
    const option = document.createElement("option");
    option.value = optionData.id;
    option.textContent = optionData.label;
    option.selected = optionData.id === appearanceSettings?.textAnswersView;
    textSelect.appendChild(option);
  }
  textRow.appendChild(textLabel);
  textRow.appendChild(textSelect);
  section.appendChild(textRow);

  return section;
}

export function createBackgroundEditor(appearanceSettings) {
  const section = document.createElement("section");
  section.className = "visual-settings";

  const modeRow = document.createElement("label");
  modeRow.className = "settings-row";
  const modeLabel = document.createElement("span");
  modeLabel.textContent = "Тип фона";
  const modeSelect = document.createElement("select");
  modeSelect.className = "input";
  modeSelect.dataset.settingPath = "appearance.backgroundType";

  const backgroundModes = [
    { id: "solid", label: "Сплошной" },
    { id: "linear", label: "Градиент" },
    { id: "radial", label: "Круговой" },
    { id: "image", label: "Медиа (растянуть)" }
  ];
  for (const mode of backgroundModes) {
    const option = document.createElement("option");
    option.value = mode.id;
    option.textContent = mode.label;
    option.selected = mode.id === appearanceSettings.backgroundType;
    modeSelect.appendChild(option);
  }
  modeRow.appendChild(modeLabel);
  modeRow.appendChild(modeSelect);

  const primaryColorRow = document.createElement("label");
  primaryColorRow.className = "settings-row";
  const primaryColorLabel = document.createElement("span");
  primaryColorLabel.textContent = "Основной цвет";
  const primaryColorInput = document.createElement("input");
  primaryColorInput.className = "input color-input";
  primaryColorInput.type = "color";
  primaryColorInput.value = appearanceSettings.backgroundColor;
  primaryColorInput.dataset.settingPath = "appearance.backgroundColor";
  primaryColorRow.appendChild(primaryColorLabel);
  primaryColorRow.appendChild(primaryColorInput);

  const gradientColorRow = document.createElement("label");
  gradientColorRow.className = "settings-row";
  gradientColorRow.dataset.backgroundSecondary = "1";
  gradientColorRow.hidden =
    appearanceSettings.backgroundType === "solid" ||
    appearanceSettings.backgroundType === "image";
  const gradientColorLabel = document.createElement("span");
  gradientColorLabel.textContent = "Второй цвет";
  const gradientColorInput = document.createElement("input");
  gradientColorInput.className = "input color-input";
  gradientColorInput.type = "color";
  gradientColorInput.value = appearanceSettings.gradientColor;
  gradientColorInput.dataset.settingPath = "appearance.gradientColor";
  gradientColorRow.appendChild(gradientColorLabel);
  gradientColorRow.appendChild(gradientColorInput);

  section.appendChild(modeRow);
  section.appendChild(primaryColorRow);
  section.appendChild(gradientColorRow);

  const imageControls = document.createElement("div");
  imageControls.className = "media-controls";
  imageControls.dataset.backgroundImageControls = "1";
  imageControls.hidden = appearanceSettings.backgroundType !== "image";

  const uploadRow = document.createElement("label");
  uploadRow.className = "settings-row";
  const uploadLabel = document.createElement("span");
  uploadLabel.textContent = "Фон (фото или gif)";
  const uploadInput = document.createElement("input");
  uploadInput.className = "input";
  uploadInput.type = "file";
  uploadInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  uploadInput.dataset.fileUpload = "appearance.backgroundMedia";
  uploadRow.appendChild(uploadLabel);
  uploadRow.appendChild(uploadInput);

  const fileMeta = document.createElement("p");
  fileMeta.className = "media-file-meta";
  fileMeta.dataset.fileMeta = "appearance.backgroundMedia";
  fileMeta.textContent = appearanceSettings?.backgroundMedia?.name
    ? `Текущий файл: ${appearanceSettings.backgroundMedia.name}`
    : "Файл пока не выбран";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "btn btn-secondary";
  clearButton.textContent = "Очистить фон";
  clearButton.dataset.fileClear = "appearance.backgroundMedia";
  clearButton.hidden = !appearanceSettings?.backgroundMedia?.src;

  imageControls.appendChild(uploadRow);
  imageControls.appendChild(fileMeta);
  imageControls.appendChild(clearButton);
  section.appendChild(imageControls);

  return section;
}
