import { HashLink } from "react-router-hash-link";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";

interface NotelinkNodeViewProps {
  node: ProseMirrorNode;
}

const NotelinkNodeView = ({ node }: NotelinkNodeViewProps) => {
  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const targetTitle = node.attrs.targetTitle;
  const targetBlockId = node.attrs.targetBlockId;

  return (
    <NodeViewWrapper as="span" className={node.attrs.type}>
      <HashLink
        to={`/app/notes/${targetTitle}${targetBlockId ? `#${targetBlockId}` : ""}`}
      >
        {suggestionChar === "[["
          ? `${suggestionChar}${targetTitle}${targetBlockId ? `::${targetBlockId}` : ""}]]`
          : `${suggestionChar}${targetTitle}`}
      </HashLink>
    </NodeViewWrapper>
  );
};

export default NotelinkNodeView;
