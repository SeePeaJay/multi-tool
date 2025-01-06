import { useEffect, useRef } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { db } from "../db";
import { useSSE } from "../contexts/SSEContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import Title from "../utils/title";

interface TitleEditorProps {
  noteId: string;
  initialEditorContent: string;
}

const TitleEditor = ({ noteId, initialEditorContent }: TitleEditorProps) => {
  const authFetch = useAuthFetch();
  const { sessionId } = useSSE();

  const editorRef = useRef<TiptapEditor | null>(null);
  const previousTitleRef = useRef(""); // a copy of the last set title value, used to reset when rename fails

  const extensions = [
    Document.extend({
      content: "title",
      addKeyboardShortcuts() {
        return {
          Enter: () => {
            this.editor.commands.blur();
            return true;
          },
        };
      },
    }),
    Title,
    Text,
    Placeholder.configure({
      placeholder: "Add a title...",
    }),
  ];

  const handleBlur = async () => {
    const newTitle = editorRef.current!.getText();
    const newTitleAlreadyExists = await db.notes.get({ title: newTitle });

    if (newTitle && !newTitleAlreadyExists) {
      try {
        db.notes.update(noteId, { title: newTitle });

        await authFetch(`/api/rename/${noteId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newTitle }),
        });

        previousTitleRef.current = newTitle;

        authFetch(`/api/broadcast`, {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initiator: sessionId }),
        });
      } catch (error) {
        console.error("An error occurred while renaming:", error);
      }
    } else {
      // reset
      setTimeout(() => {
        editorRef.current!.commands.setContent(
          `<h1 class="title">${previousTitleRef.current}</h1>`,
        );
      });
    }
  };

  // need this to dynamically update editor content whenever there is a new `noteId`
  // editor provider's `content` only works the first time a non-empty string is provided
  useEffect(() => {
    async function updateTitle() {
      if (editorRef.current && noteId) {
        const note = await db.notes.get(noteId);

        // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a
        // lifecycle method. ..."
        setTimeout(() => {
          editorRef.current!.commands.setContent(
            `<h1 class="title">${note?.title || ""}</h1>`,
          );
        });
      }
    }

    previousTitleRef.current = initialEditorContent;
    // manually update `previousTitleRef` whenever there is new batch of content
    // this line is necessary because otherwise, if users refresh the page, `isLoading` won't toggle and `TitleEditor` won't re-render, meaning `previousTitleRef` would've been stuck with an empty title

    updateTitle();
  }, [noteId]);

  return (
    <EditorProvider
      key={noteId}
      extensions={extensions}
      content={`<h1 class="title">${initialEditorContent}</h1>`} // this is still needed because `updateTitle` won't execute properly if you auth then switch tab
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onBlur={handleBlur}
    ></EditorProvider>
  );
};

export default TitleEditor;
