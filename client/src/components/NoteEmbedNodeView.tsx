import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { db } from "../db";

const NoteEmbedNodeView: React.FC<NodeViewProps> = ({ node, editor }) => {
  const { targetNoteId, targetBlockId } = node.attrs;

  const [editorUpdateCounter, setEditorUpdateCounter] = useState(0);

  // watch for editor updates
  // necessary bc sometimes when a note embed ends up at a position occupied by an old node (via dragging or other means), somehow tiptap transmits the properties of the old node to that position
  // a refresh ensures the right data is displayed
  useEffect(() => {
    if (!editor) return;

    const handleEditorUpdate = () => {
      setEditorUpdateCounter((prev) => prev + 1);
    };

    editor.on("update", handleEditorUpdate);

    return () => {
      editor.off("update", handleEditorUpdate);
    };
  }, [editor]);

  const targetNoteTitle = useLiveQuery(
    async () => {
      const note = await db.notes.get(targetNoteId);

      if (!note) {
        return `Cannot find note with id "${targetNoteId}`;
      }

      return note.title;
    },
    [editorUpdateCounter],
    "",
  );

  const targetBlockText = useLiveQuery(
    async () => {
      const note = await db.notes.get(targetNoteId);

      if (!note) {
        return `Cannot find note with id "${targetNoteId}`;
      }

      if (!note.content) {
        return "";
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");
      const targetTag = doc.getElementById(targetBlockId);

      if (!targetTag) {
        return `Cannot find tag with id "${targetBlockId}`;
      }

      // remove id to make anchor jumping more consistent
      targetTag.removeAttribute("id");

      // find the block
      let rootElement: HTMLElement | null = targetTag;
      while (
        rootElement &&
        !["p", "h1", "h2", "h3"].includes(rootElement.tagName.toLowerCase())
      ) {
        rootElement = rootElement.parentElement;
      }

      return rootElement?.outerHTML || "Cannot find block containing the tag";
    },
    [editorUpdateCounter],
    "",
  );

  return (
    <NodeViewWrapper as="div" data-type="noteEmbed">
      <NavLink className="note-embed-title" to={`/app/notes/${targetNoteId}`}>
        {targetNoteTitle}
      </NavLink>
      {targetBlockId ? (
        <HashLink
          className="block-embed"
          to={`/app/notes/${targetNoteId}#${targetBlockId}`}
          dangerouslySetInnerHTML={{
            __html:
              targetBlockText ||
              '<div class="space-y-2"><div class="h-4 bg-gray-300 rounded w-full animate-pulse"></div><div class="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div></div>',
          }}
        ></HashLink>
      ) : (
        <></>
      )}
    </NodeViewWrapper>
  );
};

export default NoteEmbedNodeView;
