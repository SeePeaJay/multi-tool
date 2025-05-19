const { mergeAttributes, Node } = require("@tiptap/core");
const { CodeBlock } = require("@tiptap/extension-code-block");
const { Document } = require("@tiptap/extension-document");
const { Heading } = require("@tiptap/extension-heading");
const { Paragraph } = require("@tiptap/extension-paragraph");
const { StarterKit } = require("@tiptap/starter-kit");

const CustomDocument = Document.extend({
  content: "frontmatter block+",
});

const Frontmatter = Node.create({
  name: "frontmatter",
  group: "frontmatter",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p.frontmatter",
      },
    ];
  },
  renderHTML() {
    return ["p", { class: "frontmatter" }, 0]; // 0 makes it editable
  },
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

const Notelink = Node.create({
  name: "notelink",
  priority: 101,
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      type: {
        default: this.name,
        parseHTML: () => this.name,
        renderHTML: () => ({ "data-type": this.name }),
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
      targetBlockId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-target-block-id"),
        renderHTML: (attributes) => {
          if (!attributes.targetBlockId) {
            return {};
          }

          return {
            "data-target-block-id": attributes.targetBlockId,
          };
        },
      },
      initialTargetTitle: {
        default: "",
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { initialTargetTitle, ...attributesToRender } = HTMLAttributes;

    return [
      "span",
      mergeAttributes(
        {
          class: "notelink",
        },
        attributesToRender,
      ),
      `[[${node.attrs.targetNoteId}${node.attrs.targetBlockId ? `::${node.attrs.targetBlockId}` : ""}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.targetNoteId}${node.attrs.targetBlockId ? `::${node.attrs.targetBlockId}` : ""}]]`;
  },
});

const Tag = Node.create({
  name: "tag",
  priority: 101,
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => ({ id: attributes.id }),
      },
      type: {
        default: this.name,
        parseHTML: () => this.name,
        renderHTML: () => ({ "data-type": this.name }),
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
      initialTargetTitle: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { initialTargetTitle, ...attributesToRender } = HTMLAttributes;

    return [
      "span",
      mergeAttributes(
        {
          class: "tag",
        },
        attributesToRender,
      ),
      `#${node.attrs.targetNoteId}`,
    ];
  },

  renderText({ node }) {
    return `#${node.attrs.targetNoteId}`;
  },
});

const Backlink = Node.create({
  name: "backlink",
  group: "block",

  addAttributes() {
    return {
      targetNoteId: {
        default: "",
      },
      targetBlockId: {
        default: "",
      },
      isLoaded: {
        // whether we've already tried to fetch the target of this backlink
        default: false,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div.backlink",
        getAttrs: (element) => ({
          targetNoteId: element.getAttribute("data-target-note-id"),
          targetBlockId: element.getAttribute("data-target-block-id"),
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { targetNoteId, targetBlockId } = HTMLAttributes;

    return [
      "div",
      {
        class: "backlink",
        "data-target-note-id": targetNoteId,
        "data-target-block-id": targetBlockId,
      },
      `$ ${targetNoteId}${targetBlockId ? `::${targetBlockId}` : ""}`,
    ];
  },
});

const BlockId = Node.create({
  name: "blockId",
  priority: 101,
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => ({ id: attributes.id }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: `span.block-id`,
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
          class: "block-id",
        },
        attributesToRender,
      ),
      `::${node.attrs.id}`,
    ];
  },

  renderText({ node }) {
    return `::${node.attrs.id}`;
  },
});

const createContentEditorExtensions = () => [
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
    history: false, // disables default history to use Collaboration's history management
  }),
  CustomDocument,
  Frontmatter,
  CustomHeading,
  CustomParagraph,
  CustomCodeBlock,
  Notelink,
  Tag,
  Backlink,
  BlockId,
];

module.exports = createContentEditorExtensions;