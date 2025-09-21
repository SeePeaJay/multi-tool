import Collaboration from "@tiptap/extension-collaboration";
import { EditorProvider } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { createContentEditorExtensions } from "shared";
import * as Y from "yjs";
import { useSession } from "../contexts/SessionContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";
import { createBaseNoteSuggestionConfig } from "../utils/baseNoteSuggestionConfig";
import {
  getTagsOnDocChange,
  syncNoteEmbedsWithTagInsertionOrRemoval,
  syncNoteEmbedsForFirstVisit,
} from "../utils/contentEditorHelpers";
import NoteEmbedNodeView from "./NoteEmbedNodeView";
import NoteReferenceNodeView from "./NoteReferenceNodeView";

interface ContentEditorProps {
  noteId: string; // using noteId props means we can call `markNoteAsActive` to setup ydocRef early
}

const ContentEditor = ({ noteId }: ContentEditorProps) => {
  const {
    statelessMessengerRef,
    currentEditorNoteId,
    updatePendingNotes,
    setupTempProvider,
    markNoteAsActive,
    markNoteAsInactive,
  } = useStatelessMessenger();
  const { isConnectedToServerRef } = useSession();

  const editorContentIsLoadedRef = useRef(false);

  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);

  const prevTagsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    currentEditorNoteId.current = noteId;

    // Inform other clients that this note is active so they can set up their own note provider to get updates
    statelessMessengerRef.current?.setAwarenessField("currentNote", noteId);

    setYdoc(markNoteAsActive({ noteId }));

    // collabProvider.on('unsyncedChanges', (n: number) => {
    //   console.log('Number of changes to send to server:', n);
    // });

    // Before component unmounts, mark current note as inactive and inform this change to other clients, so that they can destroy the note provider (assuming no other clients are actively working on the note)
    return () => {
      currentEditorNoteId.current = "";

      statelessMessengerRef.current?.setAwarenessField(
        "currentNote",
        undefined,
      ); // ref value is not a node, so we can ignore warning

      markNoteAsInactive({ noteId });
    };
  }, []);

  return ydoc ? ( // only render until ydoc is ready
    <EditorProvider
      extensions={[
        ...createContentEditorExtensions({
          NoteReferenceNodeView,
          NoteEmbedNodeView,
          baseNoteSuggestionConfig: createBaseNoteSuggestionConfig(),
        }),
        Collaboration.configure({
          document: ydoc,
        }),
      ]}
      onUpdate={({ editor }) => {
        // diff(editor.getHTML());

        if (!editor.isFocused) {
          return; // onUpdate handler is called once on mount; only execute below when editor is actually being edited
        }

        if (!isConnectedToServerRef.current) {
          updatePendingNotes("add", noteId);
        }
      }}
      onTransaction={({ transaction, editor }) => {
        if (!transaction.docChanged) {
          return;
        }

        if (transaction.getMeta("origin") === "syncNoteEmbedsForFirstVisit") {
          console.log(transaction.getMeta("origin"));
          return;
        }

        if (!editorContentIsLoadedRef.current) {
          // editor content has just been loaded

          editorContentIsLoadedRef.current = true;

          syncNoteEmbedsForFirstVisit({ noteId, editor });

          prevTagsRef.current = getTagsOnDocChange(ydoc); // prevTagsRef shouldn't be defined until this line
        } else {
          // compare current tags with previous to insert or remove note embeds

          const tagsOnDocChange = getTagsOnDocChange(ydoc);

          syncNoteEmbedsWithTagInsertionOrRemoval({
            currentNoteId: noteId,
            tagsOnDocChange,
            prevTags: prevTagsRef.current!, // ! is fine since it has been set in this case
            isConnectedToServer: isConnectedToServerRef.current,
            setupTempProvider,
            updatePendingNotes,
          });

          prevTagsRef.current = tagsOnDocChange;
        }

        // syncTagsWithNoteEmbeds
      }}
    ></EditorProvider>
  ) : null;
};

export default ContentEditor;
