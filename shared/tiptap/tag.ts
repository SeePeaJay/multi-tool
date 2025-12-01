/* This file defines a custom tag node, based on Tiptap's mention.ts. */

import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

interface TagArgs {
  TagNodeView?: React.FC<NodeViewProps>;
}

// define a type for addOptions below
type TagOptions = {
  /* Whether to delete the trigger character with backspace. */
  deleteTriggerWithBackspace: boolean;

  suggestion: Omit<SuggestionOptions, "editor">;
};

export const tagNodeName = "tag";
export const tagTriggerChar = "#";

/* This extension allows you to insert tags into the editor. */
function Tag({ TagNodeView }: TagArgs) {
  return Node.create<TagOptions>({
    name: tagNodeName,

    priority: 101,

    // to be used for functions below
    addOptions() {
      return {
        deleteTriggerWithBackspace: true,
        suggestion: {},
      };
    },

    group: "inline",

    inline: true,

    atom: true,

    addAttributes() {
      return {
        id: {
          // defining this is what allows html output to include the id, used in queriedNoteEmbeds
          default: null, // controls the initial value of the attribute internally; if empty string, UniqueID won't work as expected
          parseHTML: (element) => element.getAttribute("id"),
          renderHTML: (attributes) => ({ id: attributes.id }),
        },
        targetNoteId: {
          default: "",
          parseHTML: (element) => element.getAttribute("data-target-note-id"),
          renderHTML: (attributes) => {
            return {
              "data-target-note-id": attributes.targetNoteId,
            };
          },
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: `span.tag`,
        },
      ];
    },

    renderHTML({ node, HTMLAttributes }) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ...attributesToRender } = HTMLAttributes;

      return [
        "span",
        mergeAttributes(
          {
            class: "tag",
          },
          attributesToRender,
        ),
        `${tagTriggerChar}${node.attrs.targetNoteId}`,
      ];
    },

    renderText({ node }) {
      return `${tagTriggerChar}${node.attrs.targetNoteId}`;
    },

    addKeyboardShortcuts() {
      return {
        Backspace: () =>
          this.editor.commands.command(({ tr, state }) => {
            let isTag = false;
            const { selection } = state;
            const { empty, anchor } = selection;

            if (!empty) {
              return false;
            }

            state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
              if (node.type.name === this.name) {
                isTag = true;
                tr.insertText(
                  this.options.deleteTriggerWithBackspace
                    ? ""
                    : tagTriggerChar || "",
                  pos,
                  pos + node.nodeSize,
                );

                return false;
              }
            });

            return isTag;
          }),
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },

    /* Not adding an input rule for now since it causes weird glitches when you type whitespace */

    /* This replaces `renderHTML` with a component containing a router link, but doesn't affect the html output */
    ...(TagNodeView && {
      addNodeView() {
        return ReactNodeViewRenderer(TagNodeView);
      },
    }),
  });
}

export default Tag;
