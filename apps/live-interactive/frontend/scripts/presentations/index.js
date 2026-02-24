import { apiRequest } from "../shared/api.js?v=2";
import { requireSession } from "../shared/session.js";
import { renderAppHeader } from "../shared/app-header.js";
import { state, setPresentations } from "./state.js";
import { renderPresentations } from "./renderer.js";
import { connectPresentationStream } from "./stream.js";

const form = document.getElementById("create-presentation-form");
const presentationsList = document.getElementById("presentations-list");
const titleInput = document.getElementById("presentation-title");
const errorBox = document.getElementById("presentations-error");
const appHeaderRoot = document.getElementById("app-header-root");
const openCreateModalButton = document.getElementById("open-create-modal");
const closeCreateModalButton = document.getElementById("close-create-modal");
const createModal = document.getElementById("create-modal");
const modalBackdrop = createModal.querySelector("[data-close-modal]");
const deleteModal = document.getElementById("delete-modal");
const closeDeleteModalButton = document.getElementById("close-delete-modal");
const deleteModalBackdrop = deleteModal.querySelector("[data-close-delete-modal]");
const confirmDeleteButton = document.getElementById("confirm-delete-presentation");
const deleteModalText = document.getElementById("delete-modal-text");

let unsubscribeStream = null;
let deleteTarget = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function openCreateModal() {
  createModal.hidden = false;
  titleInput.focus();
}

function closeCreateModal() {
  createModal.hidden = true;
  form.reset();
}

function openDeleteModal({ id, title }) {
  deleteTarget = { id, title };
  deleteModalText.textContent = `Удалить мероприятие "${title}" полностью?`;
  deleteModal.hidden = false;
}

function closeDeleteModal() {
  deleteTarget = null;
  deleteModal.hidden = true;
}

function removePresentationFromState(presentationId) {
  setPresentations(
    state.presentations.filter((item) => item.id !== presentationId)
  );
  renderPresentations();
}

async function loadPresentations() {
  const payload = await apiRequest("/api/presentations");
  setPresentations(payload.items || []);
  renderPresentations();
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.replace("/login");
  }
}

async function bootstrap() {
  const user = await requireSession();
  renderAppHeader({
    mountNode: appHeaderRoot,
    user,
    onLogout: logout
  });
  await loadPresentations();

  unsubscribeStream = connectPresentationStream({
    onCreated: (presentation) => {
      setPresentations([presentation, ...state.presentations]);
      renderPresentations();
    },
    onDeleted: ({ id }) => {
      if (typeof id === "number") {
        removePresentationFromState(id);
      }
    },
    onError: () => {
      setTimeout(() => {
        if (unsubscribeStream) {
          unsubscribeStream();
        }
        bootstrap().catch((error) => showError(error.message));
      }, 1500);
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const title = titleInput.value.trim();
  if (!title) {
    showError("Введите название презентации");
    return;
  }

  try {
    const payload = await apiRequest("/api/presentations", {
      method: "POST",
      body: JSON.stringify({ title })
    });
    closeCreateModal();
    const newId = payload?.item?.id;
    if (newId) {
      window.location.href = `/presentations/${newId}/editor`;
    }
  } catch (error) {
    showError(error.message);
  }
});

openCreateModalButton.addEventListener("click", () => {
  clearError();
  openCreateModal();
});

closeCreateModalButton.addEventListener("click", closeCreateModal);
modalBackdrop.addEventListener("click", closeCreateModal);
closeDeleteModalButton.addEventListener("click", closeDeleteModal);
deleteModalBackdrop.addEventListener("click", closeDeleteModal);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !createModal.hidden) {
    closeCreateModal();
  }
  if (event.key === "Escape" && !deleteModal.hidden) {
    closeDeleteModal();
  }
});

presentationsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='delete-presentation']");
  if (!button) {
    return;
  }
  const id = Number(button.dataset.presentationId);
  const title = button.dataset.presentationTitle || "Без названия";
  if (Number.isNaN(id) || id <= 0) {
    return;
  }
  openDeleteModal({ id, title });
});

confirmDeleteButton.addEventListener("click", async () => {
  if (!deleteTarget) {
    return;
  }

  const targetId = deleteTarget.id;

  try {
    await apiRequest(`/api/presentations/${targetId}`, {
      method: "DELETE"
    });
    closeDeleteModal();
    removePresentationFromState(targetId);
  } catch (error) {
    showError(error.message);
  }
});

bootstrap().catch((error) => showError(error.message));

window.addEventListener("pageshow", () => {
  requireSession().catch(() => null);
});
