import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML } from "@tiptap/core";
import sanitizeHtml from "sanitize-html";
import { createContentEditorExtensions } from "shared";
import * as Y from "yjs";
import { db, turndownService } from "../db";

interface InitializeYDocArgs {
  noteId: string;
  ydoc: Y.Doc;
}

function getHtmlFromYdoc({ ydoc }: { ydoc: Y.Doc }) {
  const editorExtensions = createContentEditorExtensions();
  const json = TiptapTransformer.fromYdoc(
    ydoc,
    "default", // The field used in Tiptap
  );
  const html = generateHTML(json, editorExtensions);
  const sanitizedHtml = sanitizeHtml(html, {
    allowedAttributes: {
      "*": [
        "id",
        "class",
        "data-type",
        "data-target-note-id",
        "data-target-block-id",
      ],
    },
  });

  return sanitizedHtml;
}

async function setupYdoc({ noteId, ydoc }: InitializeYDocArgs) {
  // hydrate from persisted state if available
  const ydocArray = (await db.notes.get(noteId))?.ydocArray;

  if (ydocArray) {
    Y.applyUpdate(ydoc, new Uint8Array(ydocArray));

    // console.log("init ydoc for: ", noteId);
  } else {
    console.warn(`No state found for note ID: ${noteId}`);
  }

  // set up persistence: save updates to IndexedDB
  ydoc.on("update", () => {
    const html = getHtmlFromYdoc({ ydoc });

    db.notes.update(noteId, {
      ydocArray: Array.from(Y.encodeStateAsUpdate(ydoc)),
      content: html,
      contentWords: turndownService.turndown(html).split(/\s+/),
    });

    // console.log("persisted: ", noteId, getHtmlFromYdoc({ ydoc }));
  });
}

export { setupYdoc };
