import { EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import "./Editor.css";

// define your extension array
const extensions = [StarterKit];

const content =
  "<p>Multi-Tool is an experimental block-based note-taking application.</p>";

const Editor = () => {
  return (
    <EditorProvider extensions={extensions} content={content}></EditorProvider>
  );
};

export default Editor;
