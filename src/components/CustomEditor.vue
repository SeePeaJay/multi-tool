<script setup lang="ts">
import { Node } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { Plugin } from "prosemirror-state";
import { nanoid } from "nanoid";

/* Create custom node to add block id to "block" nodes - https://github.com/ueberdosis/tiptap/issues/1041#issuecomment-917610594 */
const BlockType = {
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  BULLETLIST: "bulletList",
  CODEBLOCK: "codeBlock",
  BLOCKQUOTE: "blockquote",
};
const nodeTypesThatShouldHaveBlockId = {
  [BlockType.HEADING]: true,
  [BlockType.PARAGRAPH]: true,
  [BlockType.BULLETLIST]: true,
  [BlockType.CODEBLOCK]: true,
  [BlockType.BLOCKQUOTE]: true,
};
const BlockId = Node.create({
  name: "blockId",
  addGlobalAttributes() {
    return [
      {
        types: Object.keys(nodeTypesThatShouldHaveBlockId),
        attributes: {
          blockId: {
            default: null,
            rendered: false,
            keepOnSplit: false,
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, oldState, newState) => {
          // no changes
          if (newState.doc === oldState.doc) {
            return;
          }
          const tr = newState.tr;

          newState.doc.descendants((node, pos, parent) => {
            if (
              node.isBlock &&
              parent === newState.doc &&
              !node.attrs.blockId &&
              nodeTypesThatShouldHaveBlockId[node.type.name]
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: nanoid(8),
              });
            }
          });

          return tr;
        },
      }),
    ];
  },
});

const domParser = new DOMParser();
const editor = useEditor({
  content: `
        <h1>
          Hello World
        </h1>
        <p>
          this is a <em>basic</em> example of <strong>tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists:
        </p>
        <ul>
          <li>
            That’s a bullet list with one …
          </li>
          <li>
            … or two list items.
          </li>
        </ul>
        <p>
          Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:
        </p>
        <pre><code class="language-css">body {
  display: none;
}</code></pre>
        <p>
          I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.
        </p>
        <blockquote>
          Wow, that’s amazing. Good work, boy! 👏
          <br />
          — Mom
        </blockquote>
      `,
  extensions: [BlockId, StarterKit],
  onUpdate({ editor }) {
    const blockIds: string[] = editor.getJSON().content?.map((x) => x.attrs?.blockId) || [];
    const blocksInHtml = Array.from(domParser.parseFromString(editor.getHTML(), "text/html").body.children).map(
      (element) => element.outerHTML,
    );
    const blocks: { [key: string]: string } = {};
    for (let i = 0; i < blockIds.length; i++) {
      blocks[blockIds[i]] = blocksInHtml[i];
    }

    // console.log(blockIds);
    // console.log(blocksInHtml);
    console.log(blocks);
    console.log(editor.getJSON().content);
    // console.log(editor.view.state.selection.$from.parent);
    // console.log(editor.view.state.selection.$to.parent);
  },
});
</script>

<template>
  <editor-content :editor="editor" />
</template>

<style lang="scss">
/* This controls the editor container. */
#app > div {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-y: scroll; // placing this here, rather than in .tiptap, moves the scrollbar to the window, but elements within the .tiptap div can overflow
}

/* This controls the editor. */
.tiptap {
  width: 75%;
  height: calc(100vh - 40px);
  margin: 8px 0 8px;

  /* Creates spacing between each block. */
  > * + * {
    margin-top: 0.75em;
  }

  ul,
  ol {
    padding: 0 1rem;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.1;
  }

  code {
    background-color: rgba(#616161, 0.1);
    color: #616161;
  }

  pre {
    background: #0d0d0d;
    color: #fff;
    font-family: "JetBrainsMono", monospace;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;

    code {
      color: inherit;
      padding: 0;
      background: none;
      font-size: 0.8rem;
    }
  }

  img {
    max-width: 100%;
    height: auto;
  }

  blockquote {
    padding-left: 1rem;
    border-left: 2px solid rgba(#0d0d0d, 0.1);
  }

  hr {
    border: none;
    border-top: 2px solid rgba(#0d0d0d, 0.1);
    margin: 2rem 0;
  }
}

.ProseMirror:focus {
  outline: none;
}

@media screen and (min-width: 1200px) {
  .tiptap {
    width: 50%;
  }
}
</style>
