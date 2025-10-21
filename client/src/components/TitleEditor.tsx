import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { db } from "../db";
import { useCollabResources } from "../contexts/CollabResourcesContext";
import Title from "../utils/title";

interface TitleEditorProps {
  noteId: string;
}

const TitleEditor = ({ noteId }: TitleEditorProps) => {
  const { metadataYdocRef } = useCollabResources();
  const editorRef = useRef<TiptapEditor | null>(null);
  const previousTitleRef = useRef(""); // a copy of the last set title value, used to reset when rename fails

  const noteTitleToDisplay = useLiveQuery(async () => {
    const note = await db.notes.get(noteId);
    return note?.title;
  });

  const renameNote = async () => {
    const newTitle = editorRef.current!.getText();
    const newTitleIsUnique = !(await db.notes.get({ title: newTitle }));

    if (newTitle && newTitleIsUnique) {
      try {
        const noteMetadata = metadataYdocRef.current.getMap("noteMetadata");
        noteMetadata.set(noteId, newTitle);

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

  // Update editable status whenever title to display changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setEditable(noteTitleToDisplay !== "Starred");
    }
  }, [noteTitleToDisplay]);

  // Dynamically update editor content when the query changes, due to other tabs having renamed current note, but current editor hasn't been updated yet
  useEffect(() => {
    async function updateEditorDisplayIfOutdated() {
      if (editorRef.current && noteTitleToDisplay) {
        // setTimeout is necessary to avoid the following message: "Warning: flushSync was called from inside a
        // lifecycle method. ..."
        setTimeout(() => {
          const currentTitleFromEditor = editorRef.current!.getText();

          if (currentTitleFromEditor !== noteTitleToDisplay) {
            editorRef.current!.commands.clearContent(); // need this for next line to function consistently
            editorRef.current!.commands.setContent(
              `<h1 class="title">${noteTitleToDisplay}</h1>`,
            );
            previousTitleRef.current = noteTitleToDisplay;
          }
        });
      }
    }

    updateEditorDisplayIfOutdated();
  }, [noteTitleToDisplay]);

  return (
    <EditorProvider
      extensions={[
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
      ]}
      content=""
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onBlur={renameNote}
    ></EditorProvider>
  );
};

export default TitleEditor;
