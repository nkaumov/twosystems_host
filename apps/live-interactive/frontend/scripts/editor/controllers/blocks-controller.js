import { animateFlip } from "../../shared/motion.js";
import { selectBlock, setBlocksOrder } from "../state.js";

export function createBlocksController({ listNode, onChanged }) {
  let draggedBlockId = null;
  let draggedBlockNode = null;

  function bind() {
    listNode.addEventListener("click", (event) => {
      const item = event.target.closest("[data-block-id]");
      if (!item) {
        return;
      }
      selectBlock(item.dataset.blockId);
      onChanged();
    });

    listNode.addEventListener("dragstart", (event) => {
      const item = event.target.closest("[data-block-id]");
      if (!item) {
        return;
      }
      draggedBlockId = item.dataset.blockId;
      draggedBlockNode = item;
      listNode.classList.add("sorting");
      item.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedBlockId);
      }
    });

    listNode.addEventListener("dragend", (event) => {
      const item = event.target.closest("[data-block-id]");
      item?.classList.remove("dragging");
      draggedBlockId = null;
      draggedBlockNode = null;
      listNode.classList.remove("sorting");
    });

    listNode.addEventListener("dragover", (event) => {
      if (!draggedBlockId || !draggedBlockNode) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }

      const siblings = Array.from(
        listNode.querySelectorAll(".block-item:not(.dragging)")
      );
      const nextSibling = siblings.find((node) => {
        const rect = node.getBoundingClientRect();
        return event.clientY < rect.top + rect.height / 2;
      });

      const shouldMove =
        (nextSibling && draggedBlockNode.nextSibling !== nextSibling) ||
        (!nextSibling && draggedBlockNode !== listNode.lastElementChild);
      if (!shouldMove) {
        return;
      }

      animateFlip(
        listNode,
        () => {
          if (nextSibling) {
            listNode.insertBefore(draggedBlockNode, nextSibling);
          } else {
            listNode.appendChild(draggedBlockNode);
          }
        },
        {
          selector: ".block-item",
          durationMs: 170
        }
      );
    });

    listNode.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!draggedBlockId) {
        return;
      }
      const orderedIds = Array.from(
        listNode.querySelectorAll(".block-item[data-block-id]")
      ).map((node) => node.dataset.blockId);
      setBlocksOrder(orderedIds);
      onChanged();
      draggedBlockId = null;
      draggedBlockNode = null;
      listNode.classList.remove("sorting");
    });
  }

  return {
    bind
  };
}
