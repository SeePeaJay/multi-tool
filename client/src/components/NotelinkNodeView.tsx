import { Link } from "react-router-dom";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";

interface NotelinkNodeViewProps {
  node: ProseMirrorNode;
}

const NotelinkNodeView = ({ node }: NotelinkNodeViewProps) => {
  const label = node.attrs.label;
  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";

  return (
    <NodeViewWrapper as="span" className={node.attrs.type}>
      <Link
        to={`/notes/${label}`}
      >{`${suggestionChar}${label}${suggestionChar === "[[" ? "]]" : ""}`}</Link>
    </NodeViewWrapper>
  );
};

export default NotelinkNodeView;
