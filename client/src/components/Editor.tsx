import { EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import "./Editor.css";

interface EditorProps {
  content: string;
}

// define your extension array
const extensions = [StarterKit];

const Editor = ({ content }: EditorProps) => {
  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <>
      {content ? (
        <EditorProvider
          extensions={extensions}
          content={content}
        ></EditorProvider>
      ) : null}
    </>
  );
};

export default Editor;
