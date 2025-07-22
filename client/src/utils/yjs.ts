import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML } from "@tiptap/core";
import sanitizeHtml from "sanitize-html";
import {
  createContentEditorExtensions,
  getDefaultMetadataYdocArray,
  getDefaultYdocUpdate,
} from "shared";
import * as Y from "yjs";
import { db, turndownService } from "../db";
import { NavigateFunction } from "react-router-dom";

interface InitializeYDocArgs {
  noteId: string;
  ydoc: Y.Doc;
}
interface SetupMetadataYDocArgs {
  metadataYdoc: Y.Doc;
  locationPathnameRef: React.MutableRefObject<string>;
  navigate: NavigateFunction;
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

async function setupMetadataYdoc({
  metadataYdoc,
  locationPathnameRef,
  navigate,
}: SetupMetadataYDocArgs) {
  let ydocArray = (await db.user.get(0))?.metadataYdocArray;

  if (!ydocArray) {
    ydocArray = Array.from(getDefaultMetadataYdocArray());

    await db.user.put({
      id: 0,
      metadataYdocArray: ydocArray,
    });
  }

  Y.applyUpdate(metadataYdoc, new Uint8Array(ydocArray));

  // set up persistence
  metadataYdoc.on("update", () => {
    db.user.update(0, {
      metadataYdocArray: Array.from(Y.encodeStateAsUpdate(metadataYdoc)),
    });
  });

  const ymap = metadataYdoc.getMap("noteMetadata");
  ymap.observe((event) => {
    event.changes.keys.forEach((change, key) => {
      if (change.action === "add") {
        db.notes.put({
          id: key,
          title: ymap.get(key) as string,
          content: `<p class="frontmatter"></p><p></p>`,
          contentWords: [""],
          ydocArray: Array.from(getDefaultYdocUpdate()),
        });
      } else if (change.action === "update") {
        db.notes.update(key, { title: ymap.get(key) as string });
      } else {
        db.notes.delete(key);

        if (locationPathnameRef.current === `/app/notes/${key}`) {
          navigate("/app/notes", { replace: true });
        }
      }
    });
  });
}

export { setupYdoc, setupMetadataYdoc };
