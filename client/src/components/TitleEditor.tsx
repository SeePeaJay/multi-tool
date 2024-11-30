import { useEffect, useRef } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
// import { useAuthFetch } from "../hooks/AuthFetch";
import Title from "../utils/title";
// import "./Editor.css";

interface TitleEditorProps {
  title: string;
}

const TitleEditor = ({ title }: TitleEditorProps) => {
  // const authFetch = useAuthFetch();

  const editorRef = useRef<TiptapEditor | null>(null);

  const extensions = [
    Document.extend({
      content: "title",
    }),
    Title,
    Text,
  ];

  // dynamically update editor content whenever new `title` is passed from parent
  useEffect(() => {
    if (editorRef.current && title) {
      // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a lifecycle
      // method. ..."
      setTimeout(() => {
        editorRef.current!.commands.setContent(`<h1>${title}</h1>`);
      });
    }
  }, [title]);

  return (
    <EditorProvider
      key={title}
      extensions={extensions}
      content={`<h1>${title}</h1>`}
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
    ></EditorProvider>
  );
};

export default TitleEditor;
