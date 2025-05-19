import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useLiveQuery } from "dexie-react-hooks";
import { HashLink } from "react-router-hash-link";
import { db } from "../db";

const NotelinkNodeView: React.FC<NodeViewProps> = ({
  node,
}) => {
  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const {
    targetNoteId,
    targetBlockId,
  } = node.attrs;
  const note = useLiveQuery(() => db.notes.get(targetNoteId), [targetNoteId]);

  return (
    <NodeViewWrapper
      as="span"
      // only display id if current node is a tag; used to target a block in a backlink
      id={node.attrs.type === "tag" ? node.attrs.id : ""}
      className={`${node.attrs.type} ${!note ? "text-blue-100" : ""}`}
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

export default NotelinkNodeView;
