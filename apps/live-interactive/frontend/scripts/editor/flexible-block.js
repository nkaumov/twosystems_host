export const FLEX_POSITION_OPTIONS = [
  { id: "top-left", label: "Слева вверху" },
  { id: "top-center", label: "По центру вверху" },
  { id: "top-right", label: "Справа вверху" },
  { id: "center-left", label: "Слева по центру" },
  { id: "center-center", label: "Центр" },
  { id: "center-right", label: "Справа по центру" },
  { id: "bottom-left", label: "Слева внизу" },
  { id: "bottom-center", label: "Низ" },
  { id: "bottom-right", label: "Справа внизу" }
];

const DEFAULT_HEADING_COLOR = "#1a2d24";
const DEFAULT_H1_SIZE = 72;
const DEFAULT_P_SIZE = 40;
const DEFAULT_BG_COLOR = "#ffffff";
const DEFAULT_GRADIENT_COLOR = "#d7ede1";
const DEFAULT_MEDIA_SIZE = 36;
const DEFAULT_QR_SIZE = 22;

const validPositions = new Set(FLEX_POSITION_OPTIONS.map((item) => item.id));

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  return fallback;
}

function normalizeSize(value, fallback) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(12, Math.min(240, Math.round(numeric)));
}

function normalizePosition(value, fallback) {
  const position = String(value || "").trim();
  if (validPositions.has(position)) {
    return position;
  }
  return fallback;
}

function normalizeBackgroundType(value, fallback = "solid") {
  const type = String(value || "").trim();
  if (type === "solid" || type === "linear" || type === "radial" || type === "image") {
    return type;
  }
  return fallback;
}

function normalizeDisplayTarget(value, fallback = "tv_and_guest") {
  const target = String(value || "").trim();
  if (target === "tv_only" || target === "tv_and_guest") {
    return target;
  }
  return fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function normalizePercent(value, fallback, min = 8, max = 92) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeHeading(rawHeading, defaults) {
  return {
    text: normalizeText(rawHeading?.text),
    color: normalizeColor(rawHeading?.color, defaults.color),
    size: normalizeSize(rawHeading?.size, defaults.size),
    position: normalizePosition(rawHeading?.position, defaults.position)
  };
}

export function createDefaultFlexibleSettings() {
  return {
    appearance: {
      backgroundType: "solid",
      backgroundColor: DEFAULT_BG_COLOR,
      gradientColor: DEFAULT_GRADIENT_COLOR,
      backgroundMedia: {
        src: "",
        name: "",
        mime: ""
      }
    },
    main: {
      displayTarget: "tv_and_guest"
    },
    content: {
      h1: {
        text: "",
        color: DEFAULT_HEADING_COLOR,
        size: DEFAULT_H1_SIZE,
        position: "top-center"
      },
      p: {
        text: "",
        color: DEFAULT_HEADING_COLOR,
        size: DEFAULT_P_SIZE,
        position: "center-center"
      },
      media: {
        enabled: false,
        src: "",
        name: "",
        mime: "",
        size: DEFAULT_MEDIA_SIZE,
        position: "center-center"
      }
    },
    additional: {
      showQr: false,
      qrSize: DEFAULT_QR_SIZE,
      qrPosition: "bottom-right"
    }
  };
}

export function normalizeFlexibleSettings(rawSettings) {
  const defaults = createDefaultFlexibleSettings();
  const rawP = rawSettings?.content?.p ?? rawSettings?.content?.h2;
  const rawMedia = rawSettings?.content?.media || {};
  const rawAdditional = rawSettings?.additional || {};
  return {
    appearance: {
      backgroundType: normalizeBackgroundType(
        rawSettings?.appearance?.backgroundType,
        defaults.appearance.backgroundType
      ),
      backgroundColor: normalizeColor(
        rawSettings?.appearance?.backgroundColor,
        defaults.appearance.backgroundColor
      ),
      gradientColor: normalizeColor(
        rawSettings?.appearance?.gradientColor,
        defaults.appearance.gradientColor
      ),
      backgroundMedia: {
        src: String(rawSettings?.appearance?.backgroundMedia?.src || "").trim(),
        name: String(rawSettings?.appearance?.backgroundMedia?.name || "").trim(),
        mime: String(rawSettings?.appearance?.backgroundMedia?.mime || "").trim()
      }
    },
    main: {
      displayTarget: normalizeDisplayTarget(
        rawSettings?.main?.displayTarget,
        defaults.main.displayTarget
      )
    },
    content: {
      h1: normalizeHeading(rawSettings?.content?.h1, defaults.content.h1),
      p: normalizeHeading(rawP, defaults.content.p),
      media: {
        enabled: normalizeBoolean(rawMedia.enabled, defaults.content.media.enabled),
        src: String(rawMedia.src || "").trim(),
        name: String(rawMedia.name || "").trim(),
        mime: String(rawMedia.mime || "").trim(),
        size: normalizePercent(rawMedia.size, defaults.content.media.size),
        position: normalizePosition(rawMedia.position, defaults.content.media.position)
      }
    },
    additional: {
      showQr: normalizeBoolean(rawAdditional.showQr, defaults.additional.showQr),
      qrSize: normalizePercent(rawAdditional.qrSize, defaults.additional.qrSize, 8, 60),
      qrPosition: normalizePosition(rawAdditional.qrPosition, defaults.additional.qrPosition)
    }
  };
}
