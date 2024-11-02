import { useCallback } from "react";
import { EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import debounce from "lodash.debounce";
import { useAuthFetch } from "../hooks/AuthFetch";
import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";

interface EditorProps {
  title: string;
  content: string;
}

// define your extension array
const extensions = [StarterKit];

const Editor = ({ title, content }: EditorProps) => {
  const authFetch = useAuthFetch();

  // debounce the content change handler
  const handleContentChange = useCallback(
    debounce(async (updatedContent: string) => {
      console.log(updatedContent);

      await authFetch(
        `http://localhost:3000/api/notes/Starred`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json", // specify JSON content type for below
          },
          body: JSON.stringify({ updatedContent }),
        }, // include cookies with request; required for cookie session to function
      );
    }, 500),
    [],
  );

  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <>
      <h1>{title}</h1>
      {content ? (
        <EditorProvider
          extensions={extensions}
          content={content}
          onUpdate={({ editor }) => {
            handleContentChange(editor.getHTML());
          }}
        ></EditorProvider>
      ) : (
        <SkeletonEditor />
      )}
    </>
  );
};

export default Editor;
