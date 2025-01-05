import { useEffect, useRef, useCallback } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import debounce from "lodash.debounce";
import { db } from "../db";
import { useSSE } from "../contexts/SSEContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import { createContentEditorExtensions } from "../utils/contentEditorExtensions";

interface ContentEditorProps {
  noteId: string;
  initialEditorContent: string;
}

const ContentEditor = ({
  noteId,
  initialEditorContent,
}: ContentEditorProps) => {
  const authFetch = useAuthFetch();
  const editorRef = useRef<TiptapEditor | null>(null);
  const { rerenderTrigger, sessionId } = useSSE();

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

        authFetch(`/api/broadcast`, {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initiator: sessionId }),
        });
      } catch (error) {
        console.error("Failed to save content:", error);
      }
    }, 1000),
    [],
  );

  // need this to dynamically update editor content whenever there is a new `noteId`
  // editor provider's `content` only works the first time a non-empty string is provided
  useEffect(() => {
    async function updateContent() {
      if (editorRef.current && noteId) {
        const note = await db.notes.get(noteId);

        // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a
        // lifecycle method. ..."
        setTimeout(() => {
          editorRef.current!.commands.setContent(note?.content || "");
        });
      }
    }

    // console.log(rerenderTrigger);
    updateContent();
  }, [noteId, rerenderTrigger]);

  return (
    <EditorProvider
      key={noteId}
      extensions={createContentEditorExtensions(authFetch)}
      content={initialEditorContent} // this is still needed because `updateTitle` won't execute properly if you auth then switch tab
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
