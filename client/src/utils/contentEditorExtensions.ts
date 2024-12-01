import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import CodeBlock from "@tiptap/extension-code-block";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import StarterKit from "@tiptap/starter-kit";
import Notelink from "./notelink";
import Tag from "./tag";
import EnsureUniqueIds from "./ensureUniqueIds";
import { createBaseNoteSuggestionConfig } from "./baseNoteSuggestionConfig";

const CustomHeading = Heading.extend({
  renderHTML({ node }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [`h${level}`, { id: node.attrs.blockId }, 0];
  },
});

const CustomParagraph = Paragraph.extend({
  renderHTML({ node }) {
    return ["p", { id: node.attrs.blockId }, 0];
  },
});

const CustomCodeBlock = CodeBlock.extend({
  renderHTML({ node }) {
    return ["pre", { id: node.attrs.blockId }, ["code", 0]];
  },
});

export const createContentEditorExtensions = (
  authFetch: (url: string, options?: RequestInit) => Promise<string>,
) => [
  GlobalDragHandle.configure({
    dragHandleWidth: 20,
    scrollTreshold: 100,
  }),
  StarterKit.configure({
    heading: false,
    paragraph: false,
    codeBlock: false,
    bulletList: false, // disabled due to nested structure, making it difficult to integrate with block id
    orderedList: false, // same as above
    listItem: false, // same as above
    blockquote: false, // same as above
    horizontalRule: false, // disabled because it doesn't work with current drag handle
  }),
  CustomHeading,
  CustomParagraph,
  CustomCodeBlock,
  Notelink.configure({
    suggestion: createBaseNoteSuggestionConfig(authFetch),
  }),
  Tag.configure({
    suggestion: createBaseNoteSuggestionConfig(),
  }),
  EnsureUniqueIds,
];
