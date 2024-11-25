import { Link } from "react-router-dom";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";

interface NotelinkNodeViewProps {
  node: ProseMirrorNode;
}

const NotelinkNodeView = ({ node }: NotelinkNodeViewProps) => {
  const targetTitle = node.attrs.targetTitle;
  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";

  return (
    <NodeViewWrapper as="span" className={node.attrs.type}>
      <Link
        to={`/app/notes/${targetTitle}`}
      >{`${suggestionChar}${targetTitle}${suggestionChar === "[[" ? "]]" : ""}`}</Link>
    </NodeViewWrapper>
  );
};

export default NotelinkNodeView;
