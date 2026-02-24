const previewSurfaceMap = {
  tv: { width: 1920, height: 1080 },
  guest: { width: 1080, height: 2340 }
};

function computePreviewScale(containerNode, surfaceType) {
  const surface = previewSurfaceMap[surfaceType] || previewSurfaceMap.tv;
  const width = containerNode.clientWidth || surface.width;
  const height = containerNode.clientHeight || surface.height;
  const scale = Math.min(width / surface.width, height / surface.height);
  return Math.max(scale, 0.06);
}

function getPositionStyle(position, paddingPx) {
  const [verticalRaw, horizontalRaw] = String(position || "").split("-");
  const vertical = verticalRaw || "center";
  const horizontal = horizontalRaw || "center";

  const style = {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    textAlign: horizontal === "left" ? "left" : horizontal === "right" ? "right" : "center"
  };

  if (vertical === "top") {
    style.top = `${paddingPx}px`;
    style.transform = horizontal === "center" ? "translateX(-50%)" : "none";
  } else if (vertical === "bottom") {
    style.top = "auto";
    style.bottom = `${paddingPx}px`;
    style.transform = horizontal === "center" ? "translateX(-50%)" : "none";
  }

  if (horizontal === "left") {
    style.left = `${paddingPx}px`;
    style.right = "auto";
    if (vertical === "center") {
      style.transform = "translateY(-50%)";
    }
  } else if (horizontal === "right") {
    style.left = "auto";
    style.right = `${paddingPx}px`;
    if (vertical === "center") {
      style.transform = "translateY(-50%)";
    }
  }

  return style;
}

function buildBackgroundValue(appearanceSettings) {
  const type = appearanceSettings?.backgroundType || "solid";
  const color1 = appearanceSettings?.backgroundColor || "#ffffff";
  const color2 = appearanceSettings?.gradientColor || "#d7ede1";
  const image = appearanceSettings?.backgroundMedia?.src || "";

  if (type === "linear") {
    return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  }
  if (type === "radial") {
    return `radial-gradient(circle at center, ${color2} 0%, ${color1} 72%)`;
  }
  if (type === "image" && image) {
    return `center / cover no-repeat url("${image}")`;
  }
  return color1;
}

export function renderFlexiblePreview(containerNode, selectedBlock, surfaceType) {
  containerNode.innerHTML = "";
  const mainSettings = selectedBlock.settings?.main || {};
  const content = selectedBlock.settings?.content || {};
  const appearance = selectedBlock.settings?.appearance || {};
  const additional = selectedBlock.settings?.additional || {};

  if (surfaceType === "guest" && mainSettings.displayTarget === "tv_only") {
    const wait = document.createElement("div");
    wait.className = "guest-wait-screen";
    const waitText = document.createElement("p");
    waitText.textContent = "Дождитесь когда администратор включит следующий слайд.";
    wait.appendChild(waitText);
    containerNode.appendChild(wait);
    return;
  }

  const viewport = document.createElement("div");
  viewport.className = `flex-preview-viewport flex-preview-viewport-${surfaceType}`;
  viewport.style.background = buildBackgroundValue(appearance);
  containerNode.appendChild(viewport);

  const scale = computePreviewScale(containerNode, surfaceType);
  const paddingPx = Math.max(8, Math.round(72 * scale));

  const headings = [
    { tag: "h1", key: "h1", order: 0 },
    { tag: "p", key: "p", order: 1 }
  ];

  let hasVisibleText = false;
  for (const heading of headings) {
    const entry = content?.[heading.key];
    const text = String(entry?.text || "").trim();
    if (!text) {
      continue;
    }
    hasVisibleText = true;

    const textNode = document.createElement(heading.tag);
    textNode.className = "flex-preview-text";
    textNode.textContent = text;
    textNode.style.color = entry.color;
    textNode.style.fontSize = `${Math.max(10, Math.round(Number(entry.size || 24) * scale))}px`;
    textNode.style.zIndex = String(20 + heading.order);

    const positionStyle = getPositionStyle(entry.position, paddingPx);
    textNode.style.top = positionStyle.top;
    textNode.style.left = positionStyle.left;
    textNode.style.right = positionStyle.right;
    textNode.style.bottom = positionStyle.bottom;
    textNode.style.transform = positionStyle.transform;
    textNode.style.textAlign = positionStyle.textAlign;

    viewport.appendChild(textNode);
  }

  const media = content.media || {};
  const hasMedia = media.enabled && media.src;
  const hasQr = Boolean(additional.showQr);

  if (!hasVisibleText && !hasMedia && !hasQr) {
    const empty = document.createElement("p");
    empty.className = "preview-empty";
    empty.textContent = "Добавьте Заголовок или Основной текст в настройках.";
    viewport.appendChild(empty);
  }

  if (hasMedia) {
    const mediaNode = document.createElement("img");
    mediaNode.className = "flex-preview-media";
    mediaNode.src = media.src;
    mediaNode.alt = media.name || "Медиа";
    const mediaWidth = Math.max(8, Math.min(92, Number(media.size || 36)));
    mediaNode.style.width = `${mediaWidth}%`;
    mediaNode.style.zIndex = "14";

    const mediaPosition = getPositionStyle(media.position, paddingPx);
    mediaNode.style.top = mediaPosition.top;
    mediaNode.style.left = mediaPosition.left;
    mediaNode.style.right = mediaPosition.right;
    mediaNode.style.bottom = mediaPosition.bottom;
    mediaNode.style.transform = mediaPosition.transform;
    viewport.appendChild(mediaNode);
  }

  if (additional.showQr && surfaceType === "tv") {
    const qrNode = document.createElement("div");
    qrNode.className = "flex-preview-qr";
    const qrSize = Math.max(8, Math.min(60, Number(additional.qrSize || 22)));
    qrNode.style.width = `${qrSize}%`;
    qrNode.style.zIndex = "25";

    const qrPosition = getPositionStyle(additional.qrPosition, paddingPx);
    qrNode.style.top = qrPosition.top;
    qrNode.style.left = qrPosition.left;
    qrNode.style.right = qrPosition.right;
    qrNode.style.bottom = qrPosition.bottom;
    qrNode.style.transform = qrPosition.transform;

    const liveQrUrl = String(additional?.__live?.guestJoinUrl || "").trim();
    if (liveQrUrl) {
      const qrImage = document.createElement("img");
      qrImage.alt = "QR-code подключения";
      qrImage.loading = "lazy";
      qrImage.src = `/api/qr?size=512&data=${encodeURIComponent(liveQrUrl)}`;
      qrImage.dataset.fallbackStep = "0";
      qrImage.style.width = "100%";
      qrImage.style.height = "100%";
      qrImage.style.objectFit = "contain";
      qrImage.style.borderRadius = "8px";
      qrImage.addEventListener("error", () => {
        const step = Number(qrImage.dataset.fallbackStep || "0");
        if (step === 0) {
          qrImage.dataset.fallbackStep = "1";
          qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(
            liveQrUrl
          )}`;
          return;
        }
        qrImage.remove();
        const check = document.createElement("span");
        check.className = "material-icons";
        check.textContent = "qr_code";
        qrNode.appendChild(check);
      });
      qrNode.appendChild(qrImage);
    } else {
      const check = document.createElement("span");
      check.className = "material-icons";
      check.textContent = "qr_code";
      qrNode.appendChild(check);
    }
    viewport.appendChild(qrNode);
  }
}
