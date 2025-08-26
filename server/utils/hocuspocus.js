import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML } from "@tiptap/html";
import sanitizeHtml from "sanitize-html";
import { getDefaultYdocUpdate, createContentEditorExtensions } from "shared";
import * as Y from "yjs";
import { dbGet, dbRun } from "./db.js";

export function getHocuspocusServer() {
  const server = Server.configure({
    async onAuthenticate({ request, documentName }) {
      const [userId] = documentName.split("/");
      console.log("onAuthenticate, ", userId, ", ", request.session.userId);

      if (userId !== request.session.userId) {
        throw new Error("Not authorized to access this document");
      }
    },
    async onChange({ document, documentName }) {
      const [userId, noteId] = documentName.split("/");

      if (noteId) {
        return;
      }

      const oldMetadataYdoc = new Y.Doc();
      const oldRow = await dbGet(
        "SELECT metadataYdocArray FROM users WHERE id = ?",
        [userId],
      );
      Y.applyUpdate(oldMetadataYdoc, oldRow.metadataYdocArray);

      const oldMetadataYdocMap = oldMetadataYdoc.getMap("noteMetadata");
      const newMetadataYdocMap = document.getMap("noteMetadata");
      const allNoteIds = new Set([
        ...oldMetadataYdocMap.keys(),
        ...newMetadataYdocMap.keys(),
      ]);

      for (const noteId of allNoteIds) {
        const noteIdIsInOld = [...oldMetadataYdocMap.keys()].includes(noteId);
        const noteIdIsInNew = [...newMetadataYdocMap.keys()].includes(noteId);

        if (!noteIdIsInOld && noteIdIsInNew) {
          await dbRun(
            "INSERT OR IGNORE INTO notes (id, userId, content, ydocUpdate) VALUES (?, ?, ?, ?)",
            [
              noteId,
              userId,
              `<p class="frontmatter"></p><p></p>`,
              getDefaultYdocUpdate(),
            ],
          );
        } else if (noteIdIsInOld && !noteIdIsInNew) {
          await dbRun("DELETE FROM notes WHERE id = ? AND userId = ?", [
            noteId,
            userId,
          ]);
        }
      }
    },
    async onLoadDocument(data) {
      try {
        const [userId, noteId] = data.documentName.split("/");
        const ydoc = new Y.Doc();
        const row = noteId
          ? await dbGet(
              "SELECT ydocUpdate FROM notes WHERE id = ? AND userId = ?",
              [noteId, userId],
            )
          : await dbGet("SELECT metadataYdocArray FROM users WHERE id = ?", [
              userId,
            ]);

        if (!row) throw new Error(noteId ? "Note not found" : "User not found");

        Y.applyUpdate(ydoc, noteId ? row.ydocUpdate : row.metadataYdocArray);

        return ydoc;
      } catch (err) {
        console.error("Error loading document:", err);
        throw err;
      }
    },
    async onStoreDocument(data) {
      try {
        const [userId, noteId] = data.documentName.split("/");

        if (!noteId) {
          await dbRun("UPDATE users SET metadataYdocArray = ? WHERE id = ?", [
            Y.encodeStateAsUpdate(data.document),
            userId,
          ]);
        } else {
          const editorExtensions = createContentEditorExtensions();
          const json = TiptapTransformer.fromYdoc(
            data.document,
            "default", // The field used in Tiptap
            editorExtensions, // Your editor extensions
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

          await dbRun(
            "UPDATE notes SET content = ?, ydocUpdate = ? WHERE id = ? AND userId = ?",
            [
              sanitizedHtml,
              Y.encodeStateAsUpdate(data.document),
              noteId,
              userId,
            ],
          );
        }
      } catch (err) {
        console.error("Error writing document:", err);
        throw err;
      }
    },
    async onStateless({ payload, document }) {
      // console.log(`server has received a stateless message "${payload}"!`);

      document.broadcastStateless(payload);
    },
    onConnect(data) {
      console.log(
        "connect:    ",
        data.socketId,
        " : ",
        server.getConnectionsCount() + 1,
      );
    },
    onDisconnect(data) {
      console.log(
        "disconnect: ",
        data.socketId,
        " : ",
        server.getConnectionsCount(),
      );
    },
  });

  return server;
}
