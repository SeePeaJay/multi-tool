import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useLiveQuery } from "dexie-react-hooks";
import { HashLink } from "react-router-hash-link";
import { db } from "../db";

const InlineNotelinkNodeView: React.FC<NodeViewProps> = ({ node }) => {
  const suggestionChar = node.type.name === "noteReference" ? "[[" : "#";
  const { targetNoteId, targetBlockId } = node.attrs;
  const note = useLiveQuery(() => db.notes.get(targetNoteId), [targetNoteId]);

  return (
    <NodeViewWrapper
      as="span"
      // only display id if current node is a tag; used to target a block in a note embed
      id={node.type.name === "tag" ? node.attrs.id : ""}
      className={`${node.type.name === "noteReference" ? "note-reference" : "tag"} ${!note ? "text-blue-100" : ""}`}
    >
      {!note ? (
        <>Cannot find note with id "{targetNoteId}"</>
      ) : (
        <HashLink
          to={`/app/notes/${targetNoteId}${targetBlockId ? `#${targetBlockId}` : ""}`}
        >
          {suggestionChar === "[["
            ? `${suggestionChar}${note.title}${targetBlockId ? `::${targetBlockId}` : ""}]]`
            : `${suggestionChar}${note.title}`}
        </HashLink>
      )}
    </NodeViewWrapper>
  );
};

export default InlineNotelinkNodeView;
