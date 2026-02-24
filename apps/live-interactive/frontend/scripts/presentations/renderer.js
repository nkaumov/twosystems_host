import { state } from "./state.js";

const list = document.getElementById("presentations-list");
const empty = document.getElementById("presentations-empty");

const statusMap = {
  draft: "Черновик",
  ready: "Готово",
  archived: "Архив"
};

function formatStatus(status) {
  return statusMap[status] || status;
}

export function renderPresentations() {
  list.innerHTML = "";

  if (!state.presentations.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  for (const item of state.presentations) {
    const li = document.createElement("li");
    li.className = "presentation-card";
    li.dataset.presentationId = String(item.id);

    const row = document.createElement("div");
    row.className = "presentation-row";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const actions = document.createElement("div");
    actions.className = "presentation-actions";

    const meta = document.createElement("p");
    meta.textContent = `Статус: ${formatStatus(item.status)} | Обновлено: ${new Date(
      item.updatedAt
    ).toLocaleString()}`;

    const open = document.createElement("a");
    open.href = `/presentations/${item.id}/editor`;
    open.className = "btn btn-secondary btn-icon";
    open.title = "Открыть редактор";
    open.setAttribute("aria-label", "Открыть редактор");
    const openIcon = document.createElement("span");
    openIcon.className = "material-icons";
    openIcon.setAttribute("aria-hidden", "true");
    openIcon.textContent = "edit";
    open.appendChild(openIcon);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-danger btn-icon";
    remove.title = "Удалить мероприятие";
    remove.setAttribute("aria-label", "Удалить мероприятие");
    remove.dataset.action = "delete-presentation";
    remove.dataset.presentationId = String(item.id);
    remove.dataset.presentationTitle = item.title;
    const removeIcon = document.createElement("span");
    removeIcon.className = "material-icons";
    removeIcon.setAttribute("aria-hidden", "true");
    removeIcon.textContent = "delete";
    remove.appendChild(removeIcon);

    actions.appendChild(open);
    actions.appendChild(remove);
    row.appendChild(title);
    row.appendChild(actions);
    li.appendChild(row);
    li.appendChild(meta);
    list.appendChild(li);
  }
}
