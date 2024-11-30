import { useEffect, useRef, useCallback } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import debounce from "lodash.debounce";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { createExtensions } from "../utils/extensions";
import "./Editor.css";

interface ContentEditorProps {
  title: string;
  content: string;
}

const ContentEditor = ({ title, content }: ContentEditorProps) => {
  const authFetch = useAuthFetch();

  const editorRef = useRef<TiptapEditor | null>(null);

  // debounce the content change handler
  const debounceContentUpdate = useCallback(
    debounce(async (titleToUpdate: string, updatedContent: string) => {
      console.log(titleToUpdate);

      const sanetizedContent = await authFetch(
        `/api/notes/${titleToUpdate}`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json", // specify JSON content type for below
          },
          body: JSON.stringify({ updatedContent }),
        }, // include cookies with request; required for cookie session to function
      );

      try {
        await db.notes.put({
          key: titleToUpdate,
          content: sanetizedContent,
        });
      } catch (error) {
        console.error("Failed to save content:", error);
      }
    }, 1000),
    [],
  );

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
    <EditorProvider
      key={title}
      extensions={createExtensions(authFetch)}
      content={content}
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onUpdate={({ editor }) => {
        debounceContentUpdate(title, editor.getHTML()); // passing in `title` ties the update to that `title` even if user switches to a different page before the actual update is made; this change also removes the need for `titleRef`
      }}
    ></EditorProvider>
  );
};

export default ContentEditor;
