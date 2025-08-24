import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML } from "@tiptap/core";
import sanitizeHtml from "sanitize-html";
import { createContentEditorExtensions, getDefaultYdocUpdate } from "shared";
import * as Y from "yjs";
import { db, dbCreateNote, turndownService } from "../db";

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
  const ydocArray = (await db.notes.get(noteId))?.ydocArray; // hydrate from persisted state if available
  let update;

  // console.log("init ydoc for: ", noteId);

  if (ydocArray) {
    update = new Uint8Array(ydocArray);
  } else {
    update = getDefaultYdocUpdate();

    console.warn(
      `No state found for note ID: ${noteId}, initializing note data`,
    ); // note data should be init at this point, hence the warning

    await dbCreateNote({
      id: noteId,
      title: noteId === "starred" ? "Starred" : "",
    }); // but since the ydoc is designed to persist any changes later, makes sense to ensure the row exists and can be updated now
  }

  Y.applyUpdate(ydoc, update);

  // set up persistence
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
