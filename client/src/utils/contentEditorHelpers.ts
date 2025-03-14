import { Editor as TiptapEditor } from "@tiptap/react";
import isEqual from "lodash.isequal";
import { db } from "../db";

interface FetchBacklinksParams {
  authFetch: (
    url: string,
    options?: RequestInit,
  ) => Promise<{ id: string; content: string }[]>;
  noteId: string;
}
interface UpdateBacklinksParams {
  currentBacklinks: string[] | undefined;
  editorRef: React.MutableRefObject<TiptapEditor | null>;
}

const fetchBacklinks = async ({ authFetch, noteId }: FetchBacklinksParams) => {
  // fetch notes that tag current note
  const response = await authFetch(`/api/search`, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: `#${noteId}` }),
  });

  // update Dexie
  await Promise.all(
    response.map((note: { id: string; content: string }) =>
      db.notes.update(note.id, {
        content: note.content,
      }),
    ),
  );
  await db.notes.update(noteId, {
    hasFetchedBacklinks: true,
  });
};

function updateEditorBacklinksIfOutdated({
  currentBacklinks,
  editorRef,
}: UpdateBacklinksParams) {
  const backlinksFromEditor: Record<
    string,
    Array<{ pos: number; size: number }>
  > = {};

  // populate backlinksFromEditor
  editorRef.current!.state.doc.descendants((node, pos) => {
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
    new Set(currentBacklinks),
    new Set(Object.keys(backlinksFromEditor)),
  ];

  // diff the sets and create/remove backlinks accordingly
  if (
    currentBacklinks && // backlinks can be undefined initially
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
      const { tr } = editorRef.current!.state;

      posAndSizeOfBacklink.forEach(({ pos, size }) => {
        tr.delete(pos, pos + size);
      });

      editorRef.current!.view.dispatch(tr);
    });

    backlinksToCreate.forEach((backlink) => {
      setTimeout(() => {
        const [targetNoteId, targetBlockId] = backlink.split("::");

        const endPosition = editorRef.current!.state.doc.content.size;
        editorRef.current!.commands.insertContentAt(
          endPosition,
          `<div class="backlink" data-target-note-id="${targetNoteId}" data-target-block-id="${targetBlockId}">${targetBlockId}</div>`,
        );
      });
    });
  }
}

export { updateEditorBacklinksIfOutdated, fetchBacklinks };
