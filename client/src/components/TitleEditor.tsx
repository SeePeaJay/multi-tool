import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";
import Title from "../utils/title";

const TitleEditor = () => {
  const { currentUser } = useAuth();
  const { statelessMessengerRef } = useStatelessMessenger();
  const { noteId: noteIdParam } = useParams();
  const editorRef = useRef<TiptapEditor | null>(null);
  const previousTitleRef = useRef(""); // a copy of the last set title value, used to reset when rename fails

  const noteTitleToDisplay = useLiveQuery(async () => {
    if (noteIdParam) {
      const note = await db.notes.get(noteIdParam);
      return note?.title;
    }

    return "Starred";
  }, [noteIdParam]);

  const renameNote = async () => {
    const newTitle = editorRef.current!.getText();
    const newTitleAlreadyExists = await db.notes.get({ title: newTitle });

    if (newTitle && !newTitleAlreadyExists) {
      try {
        let noteIdToUpdate = noteIdParam;

        if (!noteIdToUpdate) {
          const starred = await db.table("notes").get({ title: "Starred" });
          noteIdToUpdate = starred.id;
        }

        db.notes.update(noteIdToUpdate!, { title: newTitle });

        statelessMessengerRef.current?.sendStateless(
          JSON.stringify({
            type: "rename",
            userId: currentUser,
            noteId: noteIdToUpdate,
            title: newTitle,
          }),
        );

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

  // dynamically update editor content when the query changes due to reasons outside of renaming in the current editor
  // e.g., loading a different note, or other tabs have renamed current note but current editor hasn't been updated yet
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
      editable={noteTitleToDisplay !== "Starred"}
      content=""
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onBlur={renameNote}
    ></EditorProvider>
  );
};

export default TitleEditor;
