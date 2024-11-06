import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Fragment } from "@tiptap/pm/model";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { nanoid } from "nanoid";

interface ExtendedFragment extends Fragment {
  content: any;
}

// returns the original block id if current transaction changes a block's type (e.g., paragraph -> heading)
// ensures the block does not use the newly generated id due to the change
// NOTE: this assumes you can't multi-select in Tiptap to change the type of multiple blocks at once
function getIdForChangeInBlockType(
  oldBlockIds: string[],
  newBlockIds: string[],
) {
  // if lengths differ, current transaction should not involve change in block type, so return null
  if (oldBlockIds.length !== newBlockIds.length) {
    return null;
  }

  // if lengths match but one of the pairs differ, the corresponding block must have undergone a change in block type; return old block id in this case
  for (let i = 0; i < oldBlockIds.length; i++) {
    if (oldBlockIds[i] !== newBlockIds[i]) {
      return oldBlockIds[i];
    }
  }

  // otherwise, current transaction simply modifies a block without changing its type, so return null
  return null;
}

export const HeadingWithId = Heading.extend({
  renderHTML({ node }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [`h${level}`, { id: node.attrs.blockId }, 0];
  },
});

export const ParagraphWithId = Paragraph.extend({
  renderHTML({ node }) {
    return ["p", { id: node.attrs.blockId }, 0];
  },
});

// an extension to ensure that each (root) block node has a unique id, after the editor processes the content (from HTML to Prosemirror nodes)
export const ensureUniqueIds = Extension.create({
  name: "ensureUniqueIds",

  // define block id as an attribute globally that can be applied to multiple node types (e.g., paragraphs)
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          blockId: {
            default: null, // can be null due to parseHTML
            rendered: false,
            keepOnSplit: false, // obviously false because we want unique ids

            // define how to parse the blockId from HTML when loading content into the editor
            parseHTML: (element: Element) => element.getAttribute("id") || null,
          },
        },
      },
    ];
  },

  // add a plugin that modifies each transaction to ensure unique IDs for (root) blocks
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          const tr = newState.tr;
          const visitedBlockIds: Record<string, boolean> = {};

          const blockIdsBeforeTr = (
            oldState.doc.content as ExtendedFragment
          ).content.map((block: any) => block.attrs.blockId);
          const blockIdsAfterTr = (
            newState.doc.content as ExtendedFragment
          ).content.map((block: any) => block.attrs.blockId);

          newState.doc.descendants((node, pos, parent) => {
            // if current node is not a block, or is a block but not at the root (may be a list item), skip
            if (!node.isBlock || parent !== newState.doc) return;

            const currentBlockId = node.attrs.blockId;

            // if current block id does not exist due to splitting at the end of a block or a block type conversion, or if you split a block in the middle, assign a new block id
            if (!currentBlockId || visitedBlockIds[currentBlockId]) {
              const newBlockId =
                getIdForChangeInBlockType(blockIdsBeforeTr, blockIdsAfterTr) ||
                nanoid(6);

              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: newBlockId,
              });

              visitedBlockIds[newBlockId] = true;
            } else {
              // otherwise, add current id to visited, in case next id is the same as current
              
              visitedBlockIds[currentBlockId] = true;
            }
          });

          return tr;
        },
      }),
    ];
  },
});

// for the time being, disable lists because nested layer makes handling block id complicated
