import { Editor as TiptapEditor } from "@tiptap/react";
import isEqual from "lodash.isequal";

interface UpdateNoteEmbedsParams {
  currentNoteEmbeds: string[] | undefined;
  editorRef: React.MutableRefObject<TiptapEditor | null>;
}

function updateEditorNoteEmbedsIfOutdated({
  currentNoteEmbeds,
  editorRef,
}: UpdateNoteEmbedsParams) {
  const noteEmbedsFromEditor: Record<
    string,
    Array<{ pos: number; size: number }>
  > = {};

  // populate noteEmbedsFromEditor
  editorRef.current!.state.doc.descendants((node, pos) => {
    if (node.type.name === "noteEmbed") {
      const { targetNoteId, targetBlockId } = node.attrs;

      if (!noteEmbedsFromEditor[`${targetNoteId}::${targetBlockId}`]) {
        noteEmbedsFromEditor[`${targetNoteId}::${targetBlockId}`] = [];
      }

      noteEmbedsFromEditor[`${targetNoteId}::${targetBlockId}`].push({
        pos,
        size: node.nodeSize,
      });
    }
  });

  // convert to sets for comparison
  const [setOfNoteEmbeds, setOfNoteEmbedsFromEditor] = [
    new Set(currentNoteEmbeds),
    new Set(Object.keys(noteEmbedsFromEditor)),
  ];

  // diff the sets and create/remove note embeds accordingly
  if (
    currentNoteEmbeds && // note embeds can be undefined initially
    !isEqual(setOfNoteEmbeds, setOfNoteEmbedsFromEditor)
  ) {
    const noteEmbedsToCreate = Array.from(
      setOfNoteEmbeds.difference(setOfNoteEmbedsFromEditor),
    );
    const noteEmbedsToRemove = Array.from(
      setOfNoteEmbedsFromEditor.difference(setOfNoteEmbeds),
    );

    noteEmbedsToRemove.forEach((noteEmbed) => {
      const posAndSizeOfNoteEmbed = noteEmbedsFromEditor[noteEmbed];
      const { tr } = editorRef.current!.state;

      posAndSizeOfNoteEmbed.forEach(({ pos, size }) => {
        tr.delete(pos, pos + size);
      });

      editorRef.current!.view.dispatch(tr);
    });

    noteEmbedsToCreate.forEach((noteEmbed) => {
      setTimeout(() => {
        const [targetNoteId, targetBlockId] = noteEmbed.split("::");

        const endPosition = editorRef.current!.state.doc.content.size;
        editorRef.current!.commands.insertContentAt(
          endPosition,
          `<div class="note-embed" data-target-note-id="${targetNoteId}" data-target-block-id="${targetBlockId}">${targetBlockId}</div>`,
        );
      });
    });
  }
}

export { updateEditorNoteEmbedsIfOutdated };
