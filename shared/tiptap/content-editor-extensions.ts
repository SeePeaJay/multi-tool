import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import { NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import NoteEmbed from "./note-embed.js";
import BlockId from "./block-id.js";
import Frontmatter from "./frontmatter.js";
import Notelink, { NotelinkOptions } from "./notelink.js";
import Tag from "./tag.js";

interface CreateContentEditorExtensionsParams {
  NotelinkNodeView: React.FC<NodeViewProps>;
  NoteEmbedNodeView: React.FC<NodeViewProps>;
  baseNoteSuggestionConfig: NotelinkOptions["suggestion"];
}

const CustomDocument = Document.extend({
  content: "frontmatter block+",
});

const CustomParagraph = Paragraph.extend({
  parseHTML() {
    return [{ tag: "p:not(.frontmatter)" }]; // since frontmatter is rendered as a `p`, we need to distinguish them
  },
});

const CustomPlaceholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "frontmatter") {
      return "Add metadata...";
    }

    return "";
  },
  showOnlyWhenEditable: false,
  showOnlyCurrent: false,
});

export const createContentEditorExtensions = (
  params?: CreateContentEditorExtensionsParams,
) => {
  const { NotelinkNodeView, NoteEmbedNodeView, baseNoteSuggestionConfig } =
    params || {};

  return [
    GlobalDragHandle.configure({
      dragHandleWidth: 20,
      scrollTreshold: 100,
      excludedTags: [
        "p.frontmatter",
        "div:has(> div.pointer-events-none)", // the selector for container of node embed node view; prevent dragging the note embed until it is ready
      ],
      customNodes: ["noteEmbed"],
    }),
    StarterKit.configure({
      document: false,
      paragraph: false,
      bulletList: false, // disabled for now due to issue with earlier implementation of block id
      orderedList: false, // same as above
      listItem: false, // same as above
      blockquote: false, // same as above
      horizontalRule: false, // disabled because it doesn't work with current drag handle
      history: false, // disabled default history to use Collaboration's history management
    }),
    CustomDocument,
    Frontmatter,
    CustomParagraph,
    Notelink({ NotelinkNodeView }).configure({
      ...(baseNoteSuggestionConfig && { suggestion: baseNoteSuggestionConfig }),
    }),
    Tag({ NotelinkNodeView }).configure({
      ...(baseNoteSuggestionConfig && { suggestion: baseNoteSuggestionConfig }),
    }),
    NoteEmbed({ NoteEmbedNodeView }),
    BlockId,
    CustomPlaceholder,
  ];
};
