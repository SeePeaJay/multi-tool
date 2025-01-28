import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useLiveQuery } from "dexie-react-hooks";
import isEqual from "lodash.isequal";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";

const BacklinksNodeView: React.FC<NodeViewProps> = ({ editor }) => {
  const authFetch = useAuthFetch();
  const { noteId: noteIdParam } = useParams();

  const getBacklinksOwnerId = async () => {
    if (noteIdParam) {
      return noteIdParam; // you are in the Note route, which should have an ID at this point
    }

    const starred = await db.table("notes").get({ title: "Starred" });
    return starred?.id || null; // null bc initial load when "Starred" hasn't been fetched yet
  };

  const backlinks = useLiveQuery(async () => {
    const output: string[] = [];
    const backlinksOwnerId = await getBacklinksOwnerId();
    const hasFetchedBacklinks = (await db.notes.get(backlinksOwnerId))
      ?.hasFetchedBacklinks;

    // if "Starred" hasn't been fetched yet, or backlinks haven't been fetched yet, then there's no reason to continue
    if (!backlinksOwnerId || !hasFetchedBacklinks) {
      return undefined;
    }

    // query notes containing the keyword
    const targetNotes = await db.notes
      .filter(
        (note) =>
          !!note.contentWords &&
          note.contentWords.includes(`#${backlinksOwnerId}`),
      )
      .toArray();
    
    targetNotes.forEach((note) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");
      const targetSpans = doc.querySelectorAll(
        `span.tag[data-type="tag"][data-target-note-id="${backlinksOwnerId}"]`,
      );
      const parentElements = Array.from(targetSpans).map(
        (span) => span.parentElement!,
      );

      parentElements.forEach((element) => {
        output.push(
          `${note.id}::${
            element.classList.contains("frontmatter") ? "" : element.id
          }`,
        );
      });
    });

    return output;
  });

  // insert backlink nodes for each note/block that tags the current note
  // also remove them if their target do not tag the current note
  useEffect(() => {
    const backlinksFromEditor: Record<
      string,
      Array<{ pos: number; size: number }>
    > = {};

    // populate backlinksFromEditor
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "backlink") {
        const { targetNoteId, targetBlockId } = node.attrs;

        if (!backlinksFromEditor[`${targetNoteId}::${targetBlockId}`]) {
          backlinksFromEditor[`${targetNoteId}::${targetBlockId}`] = [];
        }

        backlinksFromEditor[`${targetNoteId}::${targetBlockId}`].push({
          pos,
          size: node.nodeSize,
        });
      }
    });

    // convert to sets for comparison
    const [setOfBacklinks, setOfBacklinksFromEditor] = [
      new Set(backlinks),
      new Set(Object.keys(backlinksFromEditor)),
    ];

    // diff the sets and create/remove backlinks accordingly
    if (
      backlinks && // backlinks can be undefined initially
      !isEqual(setOfBacklinks, setOfBacklinksFromEditor)
    ) {
      const backlinksToCreate = Array.from(
        setOfBacklinks.difference(setOfBacklinksFromEditor),
      );
      const backlinksToRemove = Array.from(
        setOfBacklinksFromEditor.difference(setOfBacklinks),
      );

      backlinksToRemove.forEach((backlink) => {
        const posAndSizeOfBacklink = backlinksFromEditor[backlink];
        const { tr } = editor.state;

        posAndSizeOfBacklink.forEach(({ pos, size }) => {
          tr.delete(pos, pos + size);
        });

        editor.view.dispatch(tr);
      });

      backlinksToCreate.forEach((backlink) => {
        setTimeout(() => {
          const [targetNoteId, targetBlockId] = backlink.split("::");

          const endPosition = editor.state.doc.content.size;
          editor.commands.insertContentAt(
            endPosition,
            `<div class="backlink" data-target-note-id="${targetNoteId}" data-target-block-id="${targetBlockId}">${targetBlockId}</div>`,
          );
        });
      });
    }
  }, [JSON.stringify(backlinks)]);
  /*
   * Why we use JSON.stringify:
   * - updating the content of editor is one of the triggers that can recompute `backlinks`
   * - when `backlinks` is recomputed, it results in a new reference value; if `backlinks` is used directly in the
   *   dependency array, useEffect will rerun even if the content of the array hasn't actually changed
   * - this is an issue if we have just removed a block link from the editor; useEffect will try to add it back
   * - to avoid this issue, we use a stringified version of the array as a dependency, to ensure that useEffect only
   *   reruns when the actual content changes (which was the intended goal anyway)
   * - no need to worry about different order because the output should remain consistent as long as the input is the
   *   same
   */

  useEffect(() => {
    const fetchBacklinks = async () => {
      const backlinksOwnerId = await getBacklinksOwnerId();

      // if "Starred" hasn't been fetched yet, immediately exit?
      if (!backlinksOwnerId) {
        return;
      }

      const cachedNote = await db.table("notes").get(backlinksOwnerId);

      if (!cachedNote.hasFetchedBacklinks) {
        // fetch notes that tag current note
        const response = await authFetch(`/api/search`, {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: `#${backlinksOwnerId}` }),
        });

        // update Dexie
        await Promise.all(
          response.map((note: { id: string; content: string }) =>
            db.notes.update(note.id, {
              content: note.content,
            }),
          ),
        );
        await db.notes.update(backlinksOwnerId, {
          hasFetchedBacklinks: true,
        });
      }
    };

    fetchBacklinks();
  }, []);

  return (
    <NodeViewWrapper as="div" className="backlinks">
      <div>Backlinks</div>
    </NodeViewWrapper>
  );
};

export default BacklinksNodeView;
