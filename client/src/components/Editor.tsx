import { useCallback } from "react";
import { EditorProvider } from "@tiptap/react";
import debounce from "lodash.debounce";
import { useAuthFetch } from "../hooks/AuthFetch";
import { extensions } from "../utils/EditorExtensions";
import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";

interface EditorProps {
  title: string;
  content: string;
}

const Editor = ({ title, content }: EditorProps) => {
  const authFetch = useAuthFetch();

  // debounce the content change handler
  const handleContentChange = useCallback(
    debounce(async (updatedContent: string) => {
      console.log(updatedContent);

      const sanetizedContent = await authFetch(
        `/api/notes/Starred`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json", // specify JSON content type for below
          },
          body: JSON.stringify({ updatedContent }),
        }, // include cookies with request; required for cookie session to function
      );

      localStorage.setItem(`Note:${title}`, sanetizedContent);
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
