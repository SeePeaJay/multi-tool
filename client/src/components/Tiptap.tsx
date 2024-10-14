import { EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import "./Tiptap.css";

// define your extension array
const extensions = [StarterKit];

const content = "<p>Hello World!</p>";

const Tiptap = () => {
  return (
    <EditorProvider extensions={extensions} content={content}>
    </EditorProvider>
  );
};

export default Tiptap;
