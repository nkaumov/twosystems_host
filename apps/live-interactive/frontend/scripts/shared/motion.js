const defaultEase = "cubic-bezier(0.22, 1, 0.36, 1)";

function nextFrame(callback) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

export function showWithMotion(node, options = {}) {
  if (!node) {
    return;
  }
  const openClass = options.openClass || "is-open";
  if (node.__motionHideTimer) {
    window.clearTimeout(node.__motionHideTimer);
    node.__motionHideTimer = null;
  }
  node.hidden = false;
  nextFrame(() => {
    node.classList.add(openClass);
  });
}

export function hideWithMotion(node, options = {}) {
  if (!node) {
    return;
  }
  const openClass = options.openClass || "is-open";
  const durationMs = Number(options.durationMs || 180);
  node.classList.remove(openClass);
  if (node.__motionHideTimer) {
    window.clearTimeout(node.__motionHideTimer);
  }
  node.__motionHideTimer = window.setTimeout(() => {
    if (!node.classList.contains(openClass)) {
      node.hidden = true;
    }
  }, durationMs);
}

export function isMotionOpen(node, options = {}) {
  if (!node) {
    return false;
  }
  const openClass = options.openClass || "is-open";
  return !node.hidden && node.classList.contains(openClass);
}

export function animateFlip(container, mutator, options = {}) {
  if (!container || typeof mutator !== "function") {
    return;
  }

  const selector = options.selector || ":scope > *";
  const durationMs = Number(options.durationMs || 180);
  const easing = options.easing || defaultEase;

  const beforeElements = Array.from(container.querySelectorAll(selector));
  const firstRects = new Map(
    beforeElements.map((element) => [element, element.getBoundingClientRect()])
  );

  mutator();

  const afterElements = Array.from(container.querySelectorAll(selector));
  for (const element of afterElements) {
    const first = firstRects.get(element);
    if (!first) {
      continue;
    }
    const last = element.getBoundingClientRect();
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      continue;
    }

    element.style.transition = "none";
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    window.requestAnimationFrame(() => {
      element.style.transition = `transform ${durationMs}ms ${easing}`;
      element.style.transform = "translate(0, 0)";
      const clear = () => {
        element.style.transition = "";
      };
      element.addEventListener("transitionend", clear, { once: true });
    });
  }
}
