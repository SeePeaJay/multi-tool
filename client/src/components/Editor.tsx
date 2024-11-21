import { useEffect, useRef, useCallback } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import debounce from "lodash.debounce";
import { useAuthFetch } from "../hooks/AuthFetch";
import { useLoading } from "../contexts/LoadingContext";
import { extensions } from "../utils/extensions";
import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";

interface EditorProps {
  title: string;
  content: string;
}

const Editor = ({ title, content }: EditorProps) => {
  const authFetch = useAuthFetch();
  const { isLoading } = useLoading();

  /*
   * This maintains a reference object that points to the `title`.
   *
   * You can't directly use `title`, because it is an empty value on first render, which will be captured and used by
   * `handleContentChange`.
   *
   * A reference allows `handleContentChange` to obtain the latest version of `title` whenever it wants.
   */
  const titleRef = useRef(title);

  const editorRef = useRef<TiptapEditor | null>(null);

  // debounce the content change handler
  const handleContentChange = useCallback(
    debounce(async (updatedContent: string) => {
      const sanetizedContent = await authFetch(
        `/api/notes/${titleRef.current}`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json", // specify JSON content type for below
          },
          body: JSON.stringify({ updatedContent }),
        }, // include cookies with request; required for cookie session to function
      );

      localStorage.setItem(`Note:${titleRef.current}`, sanetizedContent);
    }, 1000),
    [],
  );

  // update `titleRef` whenever `title` is resolved
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // dynamically update editor content whenever new `content` is passed from parent
  useEffect(() => {
    if (editorRef.current && content) {
      // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a lifecycle
      // method. ..."
      setTimeout(() => {
        editorRef.current!.commands.setContent(content);
      });
    }
  }, [content]);

  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <>
      <h1>{title}</h1>
      {isLoading ? (
        <SkeletonEditor />
      ) : (
        <EditorProvider
          key={title}
          extensions={extensions}
          content={content}
          onCreate={({ editor }) => {
            editorRef.current = editor;
          }}
          onUpdate={({ editor }) => {
            handleContentChange(editor.getHTML());
          }}
        ></EditorProvider>
      )}
    </>
  );
};

export default Editor;
