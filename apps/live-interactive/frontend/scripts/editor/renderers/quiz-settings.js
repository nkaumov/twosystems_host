import { applyPositionPickerState } from "../positioning.js";
import { appendBasicRows, createAccordion } from "./common.js";
import {
  createAdditionalEditor,
  createBackgroundEditor,
  createInteractiveAnswersEditor
} from "./visual-shared.js";

function createQuizImportInput() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json,.aivo";
  input.hidden = true;
  input.dataset.quizImportInput = "1";
  return input;
}

function createQuizCreateModal() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.dataset.quizCreateModal = "quiz-global";
  modal.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.quizAction = "create-cancel";
  modal.appendChild(backdrop);

  const card = document.createElement("div");
  card.className = "card modal-card";

  const head = document.createElement("div");
  head.className = "modal-head";
  const title = document.createElement("h3");
  title.textContent = "Создать викторину";
  head.appendChild(title);
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn-secondary btn-icon";
  closeButton.dataset.quizAction = "create-cancel";
  closeButton.title = "Закрыть";
  closeButton.setAttribute("aria-label", "Закрыть");
  const closeIcon = document.createElement("span");
  closeIcon.className = "material-icons";
  closeIcon.setAttribute("aria-hidden", "true");
  closeIcon.textContent = "close";
  closeButton.appendChild(closeIcon);
  head.appendChild(closeButton);

  const form = document.createElement("div");
  form.className = "modal-form";
  const row = document.createElement("label");
  row.className = "modal-row";
  const rowLabel = document.createElement("span");
  rowLabel.textContent = "Название викторины";
  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.maxLength = 120;
  input.placeholder = "Например: Музыкальный квиз";
  input.dataset.quizCreateTitle = "1";
  row.appendChild(rowLabel);
  row.appendChild(input);
  form.appendChild(row);

  const actionRow = document.createElement("div");
  actionRow.className = "quiz-empty-actions";
  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.className = "btn btn-primary";
  createButton.dataset.quizAction = "create-confirm";
  createButton.textContent = "Создать";
  actionRow.appendChild(createButton);
  form.appendChild(actionRow);

  card.appendChild(head);
  card.appendChild(form);
  modal.appendChild(card);
  return modal;
}

function createQuizClearModal() {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.dataset.quizClearModal = "quiz-clear-global";
  modal.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.quizAction = "clear-cancel";
  modal.appendChild(backdrop);

  const card = document.createElement("div");
  card.className = "card modal-card";

  const head = document.createElement("div");
  head.className = "modal-head";
  const title = document.createElement("h3");
  title.textContent = "Очистить викторину";
  head.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn-secondary btn-icon";
  closeButton.dataset.quizAction = "clear-cancel";
  closeButton.title = "Закрыть";
  closeButton.setAttribute("aria-label", "Закрыть");
  const closeIcon = document.createElement("span");
  closeIcon.className = "material-icons";
  closeIcon.setAttribute("aria-hidden", "true");
  closeIcon.textContent = "close";
  closeButton.appendChild(closeIcon);
  head.appendChild(closeButton);
  card.appendChild(head);

  const text = document.createElement("p");
  text.className = "muted quiz-clear-modal-text";
  text.textContent = "Все вопросы викторины будут удалены. Это действие нельзя отменить.";
  card.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "quiz-empty-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn btn-secondary";
  cancelButton.dataset.quizAction = "clear-cancel";
  cancelButton.textContent = "Отмена";
  actions.appendChild(cancelButton);

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "btn btn-danger";
  confirmButton.dataset.quizAction = "clear-confirm";
  confirmButton.textContent = "Очистить";
  actions.appendChild(confirmButton);

  card.appendChild(actions);
  modal.appendChild(card);
  return modal;
}

function createQuizEmptyState() {
  const wrapper = document.createElement("div");
  wrapper.className = "quiz-empty-state";

  const title = document.createElement("p");
  title.className = "quiz-empty-title";
  title.textContent = "Викторина пока не создана";
  wrapper.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "quiz-empty-actions";

  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.className = "btn btn-primary";
  createButton.dataset.quizAction = "create-open";
  createButton.textContent = "Создать викторину";

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "btn btn-secondary";
  importButton.dataset.quizAction = "import-aivo";
  importButton.textContent = "Импортировать файл викторины из AIVO";

  actions.appendChild(createButton);
  actions.appendChild(importButton);
  wrapper.appendChild(actions);

  const note = document.createElement("p");
  note.className = "muted quiz-import-note";
  note.dataset.quizImportNote = "1";
  note.hidden = true;
  wrapper.appendChild(note);
  wrapper.appendChild(createQuizImportInput());

  return wrapper;
}

function createQuizSummary(quiz) {
  const wrapper = document.createElement("div");
  wrapper.className = "quiz-content-summary";

  const title = document.createElement("p");
  title.className = "quiz-empty-title";
  title.textContent = quiz.title
    ? `Викторина: ${quiz.title}`
    : "Викторина без названия";
  wrapper.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "muted quiz-summary-meta";
  meta.textContent = `Вопросов: ${Array.isArray(quiz.questions) ? quiz.questions.length : 0}`;
  wrapper.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "quiz-empty-actions";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "btn btn-primary";
  openButton.dataset.quizAction = "open-editor";
  openButton.textContent = "Открыть викторину";
  actions.appendChild(openButton);

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "btn btn-secondary";
  importButton.dataset.quizAction = "import-aivo";
  importButton.textContent = "Импортировать из AIVO";
  actions.appendChild(importButton);

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "btn btn-danger";
  clearButton.dataset.quizAction = "clear-quiz";
  clearButton.textContent = "Очистить викторину";
  actions.appendChild(clearButton);

  wrapper.appendChild(actions);
  wrapper.appendChild(createQuizImportInput());

  return wrapper;
}

function createQuizQuestionCard(question, index, previewQuestionIndex) {
  const card = document.createElement("article");
  card.className = "brief-question-card quiz-card";
  if (index === previewQuestionIndex) {
    card.classList.add("quiz-card-preview-active");
  }

  const head = document.createElement("div");
  head.className = "quiz-card-head";
  const label = document.createElement("strong");
  label.textContent = `Вопрос ${index + 1}`;
  head.appendChild(label);

  const actions = document.createElement("div");
  actions.className = "quiz-card-actions";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-btn icon-btn-danger";
  deleteButton.dataset.quizAction = "delete-question";
  deleteButton.dataset.index = String(index);
  deleteButton.title = "Удалить вопрос";
  deleteButton.setAttribute("aria-label", "Удалить вопрос");
  const deleteIcon = document.createElement("span");
  deleteIcon.className = "material-icons";
  deleteIcon.setAttribute("aria-hidden", "true");
  deleteIcon.textContent = "delete";
  deleteButton.appendChild(deleteIcon);
  actions.appendChild(deleteButton);

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.className = "icon-btn";
  previewButton.dataset.quizAction = "preview-question";
  previewButton.dataset.index = String(index);
  previewButton.title = "Показать в предпросмотре";
  previewButton.setAttribute("aria-label", "Показать в предпросмотре");
  const previewIcon = document.createElement("span");
  previewIcon.className = "material-icons";
  previewIcon.setAttribute("aria-hidden", "true");
  previewIcon.textContent = "visibility";
  previewButton.appendChild(previewIcon);
  actions.appendChild(previewButton);
  head.appendChild(actions);
  card.appendChild(head);

  const typeLabel = document.createElement("label");
  typeLabel.className = "quiz-inline-label";
  typeLabel.setAttribute("for", `quiz_type_${index}`);
  typeLabel.textContent = "Тип вопроса";
  card.appendChild(typeLabel);

  const typeSelect = document.createElement("select");
  typeSelect.id = `quiz_type_${index}`;
  typeSelect.className = "input";
  typeSelect.dataset.quizField = "type";
  typeSelect.dataset.index = String(index);
  const optionSingle = document.createElement("option");
  optionSingle.value = "SINGLE_CHOICE";
  optionSingle.textContent = "Выбор из 4 вариантов";
  optionSingle.selected = question.type === "SINGLE_CHOICE";
  const optionText = document.createElement("option");
  optionText.value = "TEXT";
  optionText.textContent = "Текстовый ответ";
  optionText.selected = question.type === "TEXT";
  typeSelect.appendChild(optionSingle);
  typeSelect.appendChild(optionText);
  card.appendChild(typeSelect);

  const questionLabel = document.createElement("label");
  questionLabel.className = "quiz-inline-label";
  questionLabel.setAttribute("for", `quiz_text_${index}`);
  questionLabel.textContent = "Текст вопроса";
  card.appendChild(questionLabel);

  const questionInput = document.createElement("input");
  questionInput.id = `quiz_text_${index}`;
  questionInput.className = "input";
  questionInput.type = "text";
  questionInput.placeholder = "Введите вопрос";
  questionInput.value = String(question.questionText || "");
  questionInput.dataset.quizField = "questionText";
  questionInput.dataset.index = String(index);
  card.appendChild(questionInput);

  const body = document.createElement("div");
  body.className = "quiz-body";

  if (question.type === "TEXT") {
    const answerLabel = document.createElement("label");
    answerLabel.className = "quiz-inline-label";
    answerLabel.setAttribute("for", `quiz_answer_${index}`);
    answerLabel.textContent = "Правильный ответ";
    body.appendChild(answerLabel);

    const answerInput = document.createElement("input");
    answerInput.id = `quiz_answer_${index}`;
    answerInput.className = "input";
    answerInput.type = "text";
    answerInput.placeholder = "Введите правильный текстовый ответ";
    answerInput.value = String(question.correctText || "");
    answerInput.dataset.quizField = "correctText";
    answerInput.dataset.index = String(index);
    body.appendChild(answerInput);
  } else {
    const options = Array.isArray(question.options) ? question.options : ["", "", "", ""];
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      const row = document.createElement("div");
      row.className = "quiz-option-row";

      const radio = document.createElement("input");
      radio.className = "quiz-correct-radio";
      radio.type = "radio";
      radio.name = `quiz_correct_${index}`;
      radio.value = String(optionIndex);
      radio.dataset.quizField = "correctOptionIndex";
      radio.dataset.index = String(index);
      radio.checked = Number(question.correctOptionIndex || 0) === optionIndex;
      row.appendChild(radio);

      const optionInput = document.createElement("input");
      optionInput.className = "input";
      optionInput.type = "text";
      optionInput.placeholder = `Вариант ${optionIndex + 1}`;
      optionInput.value = String(options[optionIndex] || "");
      optionInput.dataset.quizField = "optionText";
      optionInput.dataset.index = String(index);
      optionInput.dataset.optionIndex = String(optionIndex);
      row.appendChild(optionInput);

      body.appendChild(row);
    }
  }

  card.appendChild(body);
  return card;
}

function createQuizEditorModal(quiz, previewQuestionIndex) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.dataset.quizEditorModal = "quiz-editor-global";
  modal.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.quizAction = "editor-close";
  modal.appendChild(backdrop);

  const card = document.createElement("div");
  card.className = "card modal-card quiz-editor-modal-card";

  const head = document.createElement("div");
  head.className = "modal-head";
  const title = document.createElement("h3");
  title.textContent = quiz.title || "Викторина";
  head.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn-secondary btn-icon";
  closeButton.dataset.quizAction = "editor-close";
  closeButton.title = "Закрыть";
  closeButton.setAttribute("aria-label", "Закрыть");
  const closeIcon = document.createElement("span");
  closeIcon.className = "material-icons";
  closeIcon.setAttribute("aria-hidden", "true");
  closeIcon.textContent = "close";
  closeButton.appendChild(closeIcon);
  head.appendChild(closeButton);

  card.appendChild(head);

  const body = document.createElement("div");
  body.className = "quiz-editor-modal-body";
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const questionsList = document.createElement("div");
  questionsList.className = "quiz-questions-list";
  if (!questions.length) {
    const empty = document.createElement("div");
    empty.className = "settings-placeholder";
    empty.textContent = "В викторине пока нет вопросов.";
    questionsList.appendChild(empty);
  } else {
    for (let index = 0; index < questions.length; index += 1) {
      questionsList.appendChild(createQuizQuestionCard(questions[index], index, previewQuestionIndex));
    }
  }
  body.appendChild(questionsList);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "btn btn-primary quiz-add-question-btn";
  addButton.dataset.quizAction = "add-question";
  addButton.textContent = "Добавить вопрос";
  body.appendChild(addButton);

  card.appendChild(body);
  modal.appendChild(card);
  return modal;
}

export function renderQuizSettings({ titleNode, contentNode, selectedBlock, blockType }) {
  titleNode.textContent = `Настройки: ${selectedBlock.title}`;

  const settingsForm = document.createElement("form");
  settingsForm.className = "block-settings-form";

  const mainSection = createAccordion({
    key: "quiz-main",
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
    key: "quiz-content",
    title: "Содержимое"
  });
  const contentSectionBody = document.createElement("div");
  contentSectionBody.className = "settings-accordion-body";

  const quiz = selectedBlock.settings?.content?.quiz || null;
  const previewQuestionIndex = Number(selectedBlock.settings?.content?.previewQuestionIndex || 0);
  if (!quiz) {
    contentSectionBody.appendChild(createQuizEmptyState());
  } else {
    contentSectionBody.appendChild(createQuizSummary(quiz));
  }
  contentSection.appendChild(contentSectionBody);

  const visualSection = createAccordion({
    key: "quiz-appearance",
    title: "Внешний вид"
  });
  const visualSectionBody = document.createElement("div");
  visualSectionBody.className = "settings-accordion-body";
  visualSectionBody.appendChild(createBackgroundEditor(selectedBlock.settings.appearance));
  visualSectionBody.appendChild(
    createInteractiveAnswersEditor(selectedBlock.settings.appearance, {
      displayTarget: selectedBlock.settings?.main?.displayTarget || "tv_and_guest"
    })
  );
  visualSection.appendChild(visualSectionBody);

  const additionalSection = createAccordion({
    key: "quiz-additional",
    title: "Дополнительно"
  });
  const additionalSectionBody = document.createElement("div");
  additionalSectionBody.className = "settings-accordion-body";
  additionalSectionBody.appendChild(
    createAdditionalEditor(selectedBlock.settings.additional, {
      includeConnectionPage: true
    })
  );
  additionalSection.appendChild(additionalSectionBody);

  settingsForm.appendChild(mainSection);
  settingsForm.appendChild(contentSection);
  settingsForm.appendChild(visualSection);
  settingsForm.appendChild(additionalSection);
  contentNode.appendChild(settingsForm);

  const previousCreateModal = document.querySelector("[data-quiz-create-modal='quiz-global']");
  previousCreateModal?.remove();
  const previousEditorModal = document.querySelector("[data-quiz-editor-modal='quiz-editor-global']");
  previousEditorModal?.remove();
  const previousClearModal = document.querySelector("[data-quiz-clear-modal='quiz-clear-global']");
  previousClearModal?.remove();
  if (!quiz) {
    document.body.appendChild(createQuizCreateModal());
  } else {
    document.body.appendChild(createQuizEditorModal(quiz, previewQuestionIndex));
    document.body.appendChild(createQuizClearModal());
  }

  if (!mainSection.open && !contentSection.open && !visualSection.open && !additionalSection.open) {
    mainSection.open = true;
  }

  const positionPickers = contentNode.querySelectorAll("[data-setting-drag-path]");
  for (const picker of positionPickers) {
    applyPositionPickerState(picker, picker.dataset.settingDragValue);
  }
}
