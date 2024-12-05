import { useEffect, useRef, useCallback } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import debounce from "lodash.debounce";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { createContentEditorExtensions } from "../utils/contentEditorExtensions";
import "./Editor.css";

interface ContentEditorProps {
  noteId: string;
  initialEditorContent: string;
}

const ContentEditor = ({ noteId, initialEditorContent }: ContentEditorProps) => {
  const authFetch = useAuthFetch();
  const editorRef = useRef<TiptapEditor | null>(null);

  // debounce the content change handler
  const debounceContentUpdate = useCallback(
    debounce(async (noteIdToUpdate: string, updatedContent: string) => {
      const sanetizedContent = await authFetch(
        `/api/notes/${noteIdToUpdate}`,
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
        await db.notes.update(noteIdToUpdate, {
          content: sanetizedContent,
        });
      } catch (error) {
        console.error("Failed to save content:", error);
      }
    }, 1000),
    [],
  );

  // dynamically update editor content whenever there is new `noteId`
  useEffect(() => {
    async function updateContent() {
      if (editorRef.current && noteId) {
        const note = await db.notes.get(noteId);
  
        // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a lifecycle
        // method. ..."
        setTimeout(() => {
          editorRef.current!.commands.setContent(note?.content || "");
        });
      }
    }
  
    updateContent();
  }, [noteId]);

  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <EditorProvider
      key={noteId}
      extensions={createContentEditorExtensions(authFetch)}
      content={initialEditorContent}
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onUpdate={({ editor }) => {
        debounceContentUpdate(noteId, editor.getHTML()); // passing in `noteId` ties the update to that `noteId` even if user switches to a different page before the actual update is made
      }}
    ></EditorProvider>
  );
};

export default ContentEditor;
