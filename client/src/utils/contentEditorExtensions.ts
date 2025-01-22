import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import { createBaseNoteSuggestionConfig } from "./baseNoteSuggestionConfig";
import EnsureUniqueIds from "./ensureUniqueIds";
import Backlinks from "./backlinks";
import Frontmatter from "./frontmatter";
import Notelink from "./notelink";
import Tag from "./tag";

const CustomDocument = Document.extend({
  content: "frontmatter block+ backlinks",
});

const CustomHeading = Heading.extend({
  renderHTML({ node }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [`h${level}`, { id: node.attrs.blockId }, 0];
  },
});

const CustomParagraph = Paragraph.extend({
  parseHTML() {
    return [{ tag: "p:not(.frontmatter)" }]; // since frontmatter is rendered as a `p`, we need to distinguish them
  },
  renderHTML({ node }) {
    return ["p", { id: node.attrs.blockId }, 0];
  },
});

const CustomCodeBlock = CodeBlock.extend({
  renderHTML({ node }) {
    return ["pre", { id: node.attrs.blockId }, ["code", 0]];
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
  authFetch: (url: string, options?: RequestInit) => Promise<string>,
) => [
  GlobalDragHandle.configure({
    dragHandleWidth: 20,
    scrollTreshold: 100,
    excludedTags: ["p.frontmatter"],
  }),
  StarterKit.configure({
    document: false,
    heading: false,
    paragraph: false,
    codeBlock: false,
    bulletList: false, // disabled due to nested structure, making it difficult to integrate with block id
    orderedList: false, // same as above
    listItem: false, // same as above
    blockquote: false, // same as above
    horizontalRule: false, // disabled because it doesn't work with current drag handle
  }),
  CustomDocument,
  Frontmatter,
  CustomHeading,
  CustomParagraph,
  CustomCodeBlock,
  Notelink.configure({
    authFetch,
    suggestion: createBaseNoteSuggestionConfig(authFetch),
  }),
  Tag.configure({
    suggestion: createBaseNoteSuggestionConfig(),
  }),
  Backlinks,
  EnsureUniqueIds,
  CustomPlaceholder,
];
