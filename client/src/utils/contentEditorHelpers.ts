import { Editor as TiptapEditor } from "@tiptap/react";
import isEqual from "lodash.isequal";

interface UpdateBacklinksParams {
  currentBacklinks: string[] | undefined;
  editorRef: React.MutableRefObject<TiptapEditor | null>;
}

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

export { updateEditorBacklinksIfOutdated };
