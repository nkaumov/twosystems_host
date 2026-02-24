import { apiRequest } from "../../shared/api.js?v=2";
import { renderAppHeader } from "../../shared/app-header.js";
import { requireSession } from "../../shared/session.js";
import { BLOCK_TYPES } from "../block-types.js";
import { renderBlockTypesMenu, renderPresentationMeta } from "../renderer.js";
import {
  getDraftSnapshot,
  hydrateDraft,
  replaceDraft,
  setPresentationContext
} from "../state.js";

function parsePresentationId() {
  const parts = window.location.pathname.split("/");
  const id = Number(parts[2]);
  if (Number.isNaN(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function bootstrapEditor({
  appHeaderRoot,
  titleNode,
  metaNode,
  blockTypesMenuNode,
  onLogout,
  onReady
}) {
  const user = await requireSession();
  renderAppHeader({
    mountNode: appHeaderRoot,
    user,
    onLogout
  });

  const presentationId = parsePresentationId();
  if (!presentationId) {
    throw new Error("РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РїСЂРµР·РµРЅС‚Р°С†РёРё");
  }

  const payload = await apiRequest(`/api/presentations/${presentationId}`);
  setPresentationContext(payload.item);

  hydrateDraft();
  const localSnapshot = getDraftSnapshot();

  let remoteBlocks = [];
  let remoteSelectedBlockId = null;
  let saveToDbAvailable = true;
  let nonBlockingError = "";

  try {
    const blocksPayload = await apiRequest(`/api/presentations/${presentationId}/blocks`);
    remoteBlocks = Array.isArray(blocksPayload?.items) ? blocksPayload.items : [];
    remoteSelectedBlockId = blocksPayload?.selectedBlockId || null;
  } catch (error) {
    saveToDbAvailable = false;
    nonBlockingError = error.message || "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р±Р»РѕРєРё РёР· Р‘Р”";
  }

  let shouldMigrateLocalDraft = false;
  if (remoteBlocks.length) {
    replaceDraft({
      blocks: remoteBlocks,
      selectedBlockId: remoteSelectedBlockId
    });
  } else if (localSnapshot.blocks.length) {
    replaceDraft(localSnapshot);
    shouldMigrateLocalDraft = saveToDbAvailable;
  } else {
    replaceDraft({ blocks: [] });
  }

  renderPresentationMeta({
    titleNode,
    metaNode
  });
  renderBlockTypesMenu(blockTypesMenuNode, BLOCK_TYPES);
  onReady({
    shouldMigrateLocalDraft,
    saveToDbAvailable,
    nonBlockingError
  });
}

