import { Editor as TiptapEditor } from "@tiptap/react";
import isEqual from "lodash.isequal";
import * as Y from "yjs";
import { db } from "../db";
import { setupYdoc } from "../utils/yjs";
import { useSession } from "../contexts/SessionContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";
// import { nanoid } from "nanoid";

interface SyncNoteEmbedsForFirstVisitParams {
  noteId: string;
  editor: TiptapEditor;
}
interface SyncNoteEmbedsAndTagsArgs {
  currentNoteId: string;
  prevTags: Set<string>;
  currentTags: Set<string>;
}
interface InsertNoteEmbedForTagParams {
  insertedTag: string;
  taggedNoteId: string;
  tagTargetYdoc: Y.Doc;
}
interface RemoveNoteEmbedForTagParams {
  removedTag: string;
  untaggedNoteId: string;
  tagTargetYdoc: Y.Doc;
}
// interface InsertTagForNoteEmbedArgs {
//   insertedNoteEmbed: string;
//   embeddingNoteId: string;
// }
// interface RemovePageTagForNoteEmbedArgs {
//   removedNoteEmbed: string;
//   unembeddingNoteId: string;
// }

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

    return tagsOnDocChange;
  }

  function getNoteEmbedsOnDocChange(currentYdoc: Y.Doc) {
    return new Set(
      currentYdoc
        .getXmlFragment("default")
        .toArray()
        .filter(
          (node) =>
            node instanceof Y.XmlElement && node.nodeName === "noteEmbed",
        )
        .map((embed) => {
          const { targetNoteId, targetBlockId } = (
            embed as Y.XmlElement
          ).getAttributes();

          return targetBlockId
            ? `${targetNoteId}::${targetBlockId}`
            : `${targetNoteId}`;
        }),
    );
  }

  async function syncNoteEmbedsAndTags({
    currentNoteId,
    prevTags,
    currentTags,
  }: SyncNoteEmbedsAndTagsArgs) {
    const insertedTagsByTarget: Record<string, string[]> = {};
    const removedTagsByTarget: Record<string, string[]> = {};

    currentTags.difference(prevTags).forEach((insertedTag) => {
      const key = insertedTag.split(",")[0];
      (insertedTagsByTarget[key] ||= []).push(insertedTag);
    });

    prevTags.difference(currentTags).forEach((removedTag) => {
      const key = removedTag.split(",")[0];
      (removedTagsByTarget[key] ||= []).push(removedTag);
    });

    const allTargets = [
      ...new Set([
        ...Object.keys(insertedTagsByTarget),
        ...Object.keys(removedTagsByTarget),
      ]),
    ];

    for (const target of allTargets) {
      const ydoc = new Y.Doc();
      await setupYdoc({ noteId: target, ydoc });

      let targetIsModified = false;

      ydoc.transact(() => {
        for (const insertedTag of insertedTagsByTarget[target] || []) {
          if (
            insertNoteEmbedForTag({
              insertedTag,
              taggedNoteId: currentNoteId,
              tagTargetYdoc: ydoc,
            })
          ) {
            targetIsModified = true;
          }
        }

        for (const removedTag of removedTagsByTarget[target] || []) {
          if (
            removeNoteEmbedForTag({
              removedTag,
              untaggedNoteId: currentNoteId,
              tagTargetYdoc: ydoc,
            })
          ) {
            targetIsModified = true;
          }
        }
      });

      if (!targetIsModified) return;

      if (isConnectedToServerRef.current) {
        setupTempProvider({ noteId: target, ydoc, shouldSendMsg: true });
      } else {
        updatePendingNotes("add", target);
      }
    }
  }

  function insertNoteEmbedForTag({
    insertedTag,
    taggedNoteId,
    tagTargetYdoc,
  }: InsertNoteEmbedForTagParams) {
    const [, tagId] = insertedTag.split(",");
    const xmlFragment = tagTargetYdoc.getXmlFragment("default");

    for (let i = 0; i < xmlFragment.length; i++) {
      const block = xmlFragment.get(i);

      if (
        block instanceof Y.XmlElement &&
        block.nodeName === "noteEmbed" &&
        block.getAttribute("targetNoteId") === taggedNoteId &&
        (!tagId || // if tagId is not defined, skip this check
          block.getAttribute("targetBlockId") === tagId)
      ) {
        return false;
      }
    }

    const noteEmbed = new Y.XmlElement("noteEmbed");
    noteEmbed.setAttribute("targetNoteId", taggedNoteId);
    if (tagId) {
      noteEmbed.setAttribute("targetBlockId", tagId);
    }

    xmlFragment.push([noteEmbed]);

    return true;
  }

  function removeNoteEmbedForTag({
    removedTag,
    untaggedNoteId,
    tagTargetYdoc,
  }: RemoveNoteEmbedForTagParams) {
    const [, tagId] = removedTag.split(",");
    const xmlFragment = tagTargetYdoc.getXmlFragment("default");
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

    return noteEmbedIsRemoved;
  }

  // async function insertTagForNoteEmbed({
  //   insertedNoteEmbed,
  //   embeddingNoteId,
  // }: InsertTagForNoteEmbedArgs) {
  //   const [noteEmbedTargetPageId, noteEmbedTargetBlockId] =
  //     insertedNoteEmbed.split("::");

  //   const ydoc = new Y.Doc();
  //   await setupYdoc({ noteId: noteEmbedTargetPageId, ydoc });

  //   let tagIsInserted = false;

  //   const createTag = (tagId: string) => {
  //     const tag = new Y.XmlElement("tag");
  //     tag.setAttribute("targetNoteId", embeddingNoteId);
  //     tag.setAttribute("id", tagId);
  //     return tag;
  //   };

  //   if (!noteEmbedTargetBlockId) {
  //     const frontmatter = ydoc
  //       .getXmlFragment("default")
  //       .toArray()[0] as Y.XmlElement;

  //     const tagExists = frontmatter
  //       .toArray()
  //       .some(
  //         (child) =>
  //           child instanceof Y.XmlElement &&
  //           child.nodeName === "tag" &&
  //           child.getAttributes().targetNoteId === embeddingNoteId,
  //       );

  //     if (!tagExists) {
  //       frontmatter.push([createTag(nanoid(6))]);
  //       tagIsInserted = true;
  //     }
  //   } else {
  //     const walker = ydoc
  //       .getXmlFragment("default")
  //       .createTreeWalker(
  //         (xml) => xml instanceof Y.XmlElement && xml.nodeName === "blockId",
  //       );

  //     for (const blockIdNode of walker) {
  //       if (!(blockIdNode instanceof Y.XmlElement)) continue;

  //       const blockNode = blockIdNode.parent;
  //       if (!(blockNode instanceof Y.XmlElement)) continue;

  //       const { id: blockId } = blockIdNode.getAttributes();
  //       if (blockId !== noteEmbedTargetBlockId) continue;

  //       const blockIdNodeIndex = blockNode.toArray().indexOf(blockIdNode);
  //       blockNode.delete(blockIdNodeIndex, 1);

  //       blockNode.push([createTag(noteEmbedTargetBlockId)]);
  //       tagIsInserted = true;

  //       break;
  //     }
  //   }

  //   if (!tagIsInserted) return;
  // }

  // async function removeTagForNoteEmbed({
  //   removedNoteEmbed,
  //   unembeddingNoteId,
  // }: RemovePageTagForNoteEmbedArgs) {
  //   const [noteEmbedTargetPageId, noteEmbedTargetBlockId] =
  //     removedNoteEmbed.split("::");

  //   const ydoc = new Y.Doc();
  //   await setupYdoc({ noteId: noteEmbedTargetPageId, ydoc });

  //   let tagIsRemoved = false;

  //   const walker = ydoc
  //     .getXmlFragment("default")
  //     .createTreeWalker(
  //       (xml) => xml instanceof Y.XmlElement && xml.nodeName === "tag",
  //     );

  //   for (const tag of walker) {
  //     if (
  //       !(tag instanceof Y.XmlElement) ||
  //       !(tag.parent instanceof Y.XmlElement)
  //     ) {
  //       continue;
  //     }

  //     const { targetNoteId: tagTargetNoteId, id: tagId } = tag.getAttributes();
  //     if (tagTargetNoteId !== unembeddingNoteId) continue;

  //     const tagIndex = tag.parent.toArray().indexOf(tag);

  //     console.log(
  //       "tag found",
  //       noteEmbedTargetBlockId,
  //       tag.parent.nodeName,
  //       tagId,
  //     );

  //     // Case 1: removing a page embed
  //     if (!noteEmbedTargetBlockId && tag.parent.nodeName === "frontmatter") {
  //       console.log("tag case 1", tag, tagIndex);

  //       tag.parent.delete(tagIndex, 1);

  //       tagIsRemoved = true;
  //     }

  //     // Case 2: removing a block embed
  //     if (noteEmbedTargetBlockId && tagId && noteEmbedTargetBlockId === tagId) {
  //       console.log("tag case 2", tag);

  //       tag.parent.delete(tagIndex, 1);
  //       tagIsRemoved = true;

  //       // Replace with placeholder space + blockId marker
  //       const space = new Y.XmlText();
  //       space.insert(0, " ");
  //       const blockId = new Y.XmlElement("blockId");
  //       blockId.setAttribute("id", tagId);

  //       tag.parent.push([space, blockId]);
  //     }
  //   }

  //   if (!tagIsRemoved) return;
  // }

  return {
    syncNoteEmbedsForFirstVisit,
    getTagsOnDocChange,
    getNoteEmbedsOnDocChange,
    syncNoteEmbedsAndTags,
  };
}
