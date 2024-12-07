import { useEffect, useRef } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import Title from "../utils/title";
// import "./Editor.css";

interface TitleEditorProps {
  noteId: string;
  initialEditorContent: string;
}

const TitleEditor = ({ noteId, initialEditorContent }: TitleEditorProps) => {
  const authFetch = useAuthFetch();
  const editorRef = useRef<TiptapEditor | null>(null);
  const previousTitleRef = useRef(initialEditorContent); // a copy of the last set title value, used to reset when rename fails

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

  // it appears editor provider's `content` only works the first time a non-empty string is provided
  // we need this to dynamically update editor content whenever there is a new `noteId`
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

    updateTitle();
  }, [noteId]);

  return (
    <EditorProvider
      key={noteId}
      extensions={extensions}
      content={`<h1 class="title">${initialEditorContent}</h1>`}
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onBlur={handleBlur}
    ></EditorProvider>
  );
};

export default TitleEditor;
