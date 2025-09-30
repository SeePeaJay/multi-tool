import { Editor as TiptapEditor } from "@tiptap/react";
import isEqual from "lodash.isequal";
import * as Y from "yjs";
import { db } from "../db";
import { setupYdoc } from "../utils/yjs";
import { useSession } from "../contexts/SessionContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";

interface SyncNoteEmbedsForFirstVisitParams {
  noteId: string;
  editor: TiptapEditor;
}
interface SyncNoteEmbedsWithTagsParams {
  currentNoteId: string;
  tagsOnDocChange: Set<string>;
  prevTags: Set<string>;
}
interface InsertNoteEmbedForTagParams {
  insertedTag: string;
  taggedNoteId: string;
}
interface RemoveNoteEmbedForTagParams {
  removedTag: string;
  untaggedNoteId: string;
}

export function useContentEditorHelpers() {
  const { isConnectedToServerRef } = useSession();
  const { setupTempProvider, updatePendingNotes } = useStatelessMessenger();

  async function getNoteEmbedsForFirstVisit(noteId: string) {
    const output: string[] = [];

    // query notes containing the tag
    const targetNotes = await db.notes
      .filter(
        (note) =>
          !!note.contentWords && note.contentWords.includes(`#${noteId}`),
      )
      .toArray();

    targetNotes.forEach((note) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");
      const targetSpans = doc.querySelectorAll(
        `span.tag[data-type="tag"][data-target-note-id="${noteId}"]`,
      );
      const parentElements = Array.from(targetSpans).map(
        (span) => span.parentElement!,
      );

      parentElements.forEach((element, index) => {
        output.push(
          `${note.id}::${
            element.classList.contains("frontmatter")
              ? ""
              : targetSpans[index].id
          }`,
        );
      });
    });

    return output;
  }

  async function syncNoteEmbedsForFirstVisit({
    noteId,
    editor,
  }: SyncNoteEmbedsForFirstVisitParams) {
    // populate what you have right now
    const currentNoteEmbeds: Record<
      string,
      Array<{ pos: number; size: number }>
    > = {};

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "noteEmbed") {
        const { targetNoteId, targetBlockId } = node.attrs;

        if (!currentNoteEmbeds[`${targetNoteId}::${targetBlockId}`]) {
          currentNoteEmbeds[`${targetNoteId}::${targetBlockId}`] = [];
        }

        currentNoteEmbeds[`${targetNoteId}::${targetBlockId}`].push({
          pos,
          size: node.nodeSize,
        });
      }
    });

    // populate what you should have
    const expectedNoteEmbeds = await getNoteEmbedsForFirstVisit(noteId);

    // convert to sets for comparison
    const [expectedNoteEmbedSet, currentNoteEmbedSet] = [
      new Set(expectedNoteEmbeds),
      new Set(Object.keys(currentNoteEmbeds)),
    ];

    // diff the sets and create/remove note embeds accordingly
    if (!isEqual(expectedNoteEmbedSet, currentNoteEmbedSet)) {
      const noteEmbedsToCreate = Array.from(
        expectedNoteEmbedSet.difference(currentNoteEmbedSet),
      );
      const noteEmbedsToRemove = Array.from(
        currentNoteEmbedSet.difference(expectedNoteEmbedSet),
      );

      noteEmbedsToRemove.forEach((noteEmbed) => {
        const posAndSizeOfNoteEmbed = currentNoteEmbeds[noteEmbed];
        const { tr } = editor.state;

        posAndSizeOfNoteEmbed.forEach(({ pos, size }) => {
          tr.delete(pos, pos + size);
        });

        tr.setMeta("origin", "syncNoteEmbedsForFirstVisit");

        editor.view.dispatch(tr);
      });

      noteEmbedsToCreate.forEach((noteEmbed) => {
        setTimeout(() => {
          const [targetNoteId, targetBlockId] = noteEmbed.split("::");

          const endPosition = editor.state.doc.content.size;
          editor
            .chain()
            .insertContentAt(
              endPosition,
              `<div class="note-embed" data-target-note-id="${targetNoteId}" data-target-block-id="${targetBlockId}">${targetBlockId}</div>`,
            )
            .setMeta("origin", "syncNoteEmbedsForFirstVisit")
            .run();
        });
      });
    }
  }

  function getTagsOnDocChange(currentYdoc: Y.Doc) {
    const xmlFragment = currentYdoc.getXmlFragment("default");
    const tagsOnDocChange: Set<string> = new Set();

    for (const tag of xmlFragment.createTreeWalker(
      (xml) => xml instanceof Y.XmlElement && xml.nodeName === "tag",
    )) {
      if (!(tag instanceof Y.XmlElement)) {
        continue;
      }

      const { targetNoteId, id } = tag.getAttributes();

      if (!targetNoteId || !id) {
        console.warn("targetNoteId or id undefined");
        continue;
      }

      if (
        tag.parent instanceof Y.XmlElement &&
        tag.parent.nodeName === "frontmatter"
      ) {
        tagsOnDocChange.add(targetNoteId);
      } else {
        tagsOnDocChange.add(`${targetNoteId},${id}`);
      }
    }

    console.log(tagsOnDocChange);
    return tagsOnDocChange;
  }

  function syncNoteEmbedsWithTags({
    currentNoteId,
    tagsOnDocChange,
    prevTags,
  }: SyncNoteEmbedsWithTagsParams) {
    const tagsInserted = tagsOnDocChange.difference(prevTags);
    const tagsRemoved = prevTags.difference(tagsOnDocChange);

    for (const tag of tagsInserted) {
      insertNoteEmbedForTag({
        insertedTag: tag,
        taggedNoteId: currentNoteId,
      });
    }

    for (const tag of tagsRemoved) {
      removeNoteEmbedForTag({
        removedTag: tag,
        untaggedNoteId: currentNoteId,
      });
    }
  }

  async function insertNoteEmbedForTag({
    insertedTag,
    taggedNoteId,
  }: InsertNoteEmbedForTagParams) {
    const [targetNoteId, tagId] = insertedTag.split(",");

    const ydoc = new Y.Doc();
    await setupYdoc({ noteId: targetNoteId, ydoc });

    const xmlFragment = ydoc.getXmlFragment("default");
    let noteEmbedAlreadyExists = false;

    for (let i = 0; i < xmlFragment.length; i++) {
      const block = xmlFragment.get(i);

      if (
        block instanceof Y.XmlElement &&
        block.nodeName === "noteEmbed" &&
        block.getAttribute("targetNoteId") === taggedNoteId &&
        (!tagId || // if tagId is not defined, skip this check
          block.getAttribute("targetBlockId") === tagId)
      ) {
        noteEmbedAlreadyExists = true;
        break;
      }
    }

    if (!noteEmbedAlreadyExists) {
      const noteEmbed = new Y.XmlElement("noteEmbed");
      noteEmbed.setAttribute("targetNoteId", taggedNoteId);
      if (tagId) {
        noteEmbed.setAttribute("targetBlockId", tagId);
      }

      xmlFragment.push([noteEmbed]);

      if (isConnectedToServerRef.current) {
        setupTempProvider({ noteId: targetNoteId, ydoc, shouldSendMsg: true });
      } else {
        updatePendingNotes("add", targetNoteId);
      }
    }
  }

  async function removeNoteEmbedForTag({
    removedTag,
    untaggedNoteId,
  }: RemoveNoteEmbedForTagParams) {
    const [targetNoteId, tagId] = removedTag.split(",");

    const ydoc = new Y.Doc();
    await setupYdoc({ noteId: targetNoteId, ydoc });

    const xmlFragment = ydoc.getXmlFragment("default");
    let noteEmbedIsRemoved = false;

    for (let i = xmlFragment.length - 1; i >= 0; i--) {
      const block = xmlFragment.get(i);

      if (
        block instanceof Y.XmlElement &&
        block.nodeName === "noteEmbed" &&
        block.getAttribute("targetNoteId") === untaggedNoteId &&
        (!tagId || // if tagId is not defined, skip this check
          block.getAttribute("targetBlockId") === tagId)
      ) {
        xmlFragment.delete(i, 1);
        noteEmbedIsRemoved = true;
      }
    }

    if (!noteEmbedIsRemoved) {
      return;
    }

    if (isConnectedToServerRef.current) {
      setupTempProvider({ noteId: targetNoteId, ydoc, shouldSendMsg: true });
    } else {
      updatePendingNotes("add", targetNoteId);
    }
  }

  return {
    syncNoteEmbedsForFirstVisit,
    getTagsOnDocChange,
    syncNoteEmbedsWithTags,
  };
}

// embeddingNoteId
