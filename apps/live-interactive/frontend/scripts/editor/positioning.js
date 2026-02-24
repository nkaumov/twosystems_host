export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getPositionIdByRatios(xRatio, yRatio) {
  const horizontal = xRatio < 1 / 3 ? "left" : xRatio > 2 / 3 ? "right" : "center";
  const vertical = yRatio < 1 / 3 ? "top" : yRatio > 2 / 3 ? "bottom" : "center";
  return `${vertical}-${horizontal}`;
}

export function getPositionPercent(positionId) {
  const [verticalRaw, horizontalRaw] = String(positionId || "").split("-");
  const vertical = verticalRaw || "center";
  const horizontal = horizontalRaw || "center";

  const x = horizontal === "left" ? 16 : horizontal === "right" ? 84 : 50;
  const y = vertical === "top" ? 16 : vertical === "bottom" ? 84 : 50;
  return { x, y };
}

export function applyPositionPickerState(containerNode, positionId) {
  if (!containerNode) {
    return;
  }
  containerNode.dataset.settingDragValue = positionId;
  const marker = containerNode.querySelector("[data-position-marker]");
  if (!marker) {
    return;
  }
  const point = getPositionPercent(positionId);
  marker.style.left = `${point.x}%`;
  marker.style.top = `${point.y}%`;
}
