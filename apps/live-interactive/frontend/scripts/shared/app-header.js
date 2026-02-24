function createNode(tagName, className) {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  return node;
}

export function renderAppHeader({ mountNode, user, onLogout }) {
  if (!mountNode) {
    return;
  }

  const login = user?.login || user?.email || "unknown";
  const displayName = user?.displayName || "Пользователь";

  mountNode.innerHTML = "";

  const header = createNode("header", "card app-header");

  const left = createNode("div", "app-header-left");
  const logo = createNode("img", "app-header-logo");
  logo.src = "/logo.png?v=2";
  logo.alt = "Логотип";
  logo.width = 46;
  logo.height = 46;
  left.appendChild(logo);

  const textWrap = createNode("div", "app-header-text");
  const title = createNode("h1", "app-header-title");
  title.textContent = "LUNA";
  const subtitle = createNode("p", "app-header-subtitle");
  subtitle.textContent = `${displayName} (@${login})`;
  textWrap.appendChild(title);
  textWrap.appendChild(subtitle);
  left.appendChild(textWrap);

  const right = createNode("div", "app-header-right");
  const logoutButton = createNode("button", "btn btn-danger btn-icon");
  logoutButton.id = "app-header-logout";
  logoutButton.type = "button";
  logoutButton.title = "Выйти";
  logoutButton.setAttribute("aria-label", "Выйти");

  const icon = createNode("span", "material-icons");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "logout";
  logoutButton.appendChild(icon);
  right.appendChild(logoutButton);

  header.appendChild(left);
  header.appendChild(right);

  mountNode.appendChild(header);
  logoutButton.addEventListener("click", onLogout);
}
