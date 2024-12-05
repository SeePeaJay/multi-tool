import { useEffect, useRef } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { db } from "../db";
import Title from "../utils/title";
// import "./Editor.css";

interface TitleEditorProps {
  noteId: string;
  initialEditorContent: string;
}

const TitleEditor = ({ noteId, initialEditorContent }: TitleEditorProps) => {
  const editorRef = useRef<TiptapEditor | null>(null);

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

  // dynamically update editor content whenever new `noteId` is passed from parent
  useEffect(() => {
    async function updateTitle() {
      if (editorRef.current && noteId) {
        const note = await db.notes.get(noteId);
  
        // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a lifecycle
        // method. ..."
        setTimeout(() => {
          editorRef.current!.commands.setContent(`<h1 class="title">${note?.title || ""}</h1>`);
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
      onBlur={() => {
        console.log("Title editor blurred; should rename");
      }}
    ></EditorProvider>
  );
};

export default TitleEditor;
