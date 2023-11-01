import { ref } from "vue";
import { defineStore } from "pinia";

export const useEditorStore = defineStore("editor", () => {
  // const blockContents = ref({} as { [id: string]: string });
  const blocksInHtml = ref(`
        <h1 id="aaaaaaaa">
          Hello World
        </h1>
        <p id="aaaaaaab">
          this is a <em>basic</em> example of <strong>tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists: <span class="engram-link" data-target="dog" data-is-tag>#dog</span> <span class="engram-link" data-target="cat">cat</span>
        </p>
        <ul id="aaaaaaac">
          <li>
            That’s a bullet list with one …
          </li>
          <li>
            … or two list items.
          </li>
        </ul>
        <p id="aaaaaaad">
          Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:
        </p>
        <pre id="aaaaaaae"><code class="language-css">body {
  display: none;
}</code></pre>
        <p id="aaaaaaaf">
          I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.
        </p>
        <blockquote id="aaaaaaag">
          Wow, that’s amazing. Good work, boy! 👏
          <br />
          — Mom
        </blockquote>
      `);

  function setBlocksInHtml(newBlockContents: string) {
    blocksInHtml.value = newBlockContents;
  }

  return { blocksInHtml, setBlocksInHtml };
});
