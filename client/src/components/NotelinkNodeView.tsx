import { useEffect, useState } from "react";
import { HashLink } from "react-router-hash-link";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { db } from "../db";

interface NotelinkNodeViewProps {
  node: ProseMirrorNode;
}

const NotelinkNodeView = ({ node }: NotelinkNodeViewProps) => {
  const [targetTitle, setTargetTitle] = useState<string>("");

  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const targetNoteId = node.attrs.targetNoteId;
  const targetBlockId = node.attrs.targetBlockId;

  // on start, find the target title for this notelink/tag to display
  useEffect(() => {
    const fetchTargetTitle = async () => {
      try {
        const targetNote = await db.notes.get(targetNoteId);
        setTargetTitle(targetNote!.title);
      } catch (error) {
        console.error("Error fetching note title:", error);
        setTargetTitle("Error: cannot fetch note title");
      }
    };

    fetchTargetTitle();
  }, []);

  return (
    <NodeViewWrapper as="span" className={node.attrs.type}>
      <HashLink
        to={`/app/notes/${targetNoteId}${targetBlockId ? `#${targetBlockId}` : ""}`}
      >
        {suggestionChar === "[["
          ? `${suggestionChar}${targetTitle}${targetBlockId ? `::${targetBlockId}` : ""}]]`
          : `${suggestionChar}${targetTitle}`}
      </HashLink>
    </NodeViewWrapper>
  );
};

export default NotelinkNodeView;
