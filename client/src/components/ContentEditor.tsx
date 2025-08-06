import Collaboration from "@tiptap/extension-collaboration";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { createContentEditorExtensions } from "shared";
import * as Y from "yjs";
import { db } from "../db";
import { useSession } from "../contexts/SessionContext";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";
import { createBaseNoteSuggestionConfig } from "../utils/baseNoteSuggestionConfig";
import { updateEditorBacklinksIfOutdated } from "../utils/contentEditorHelpers";
import BacklinkNodeView from "./BacklinkNodeView";
import NotelinkNodeView from "./NotelinkNodeView";

interface ContentEditorProps {
  noteId: string; // using noteId props means we can call `markNoteAsActive` to setup ydocRef early
}

const ContentEditor = ({ noteId }: ContentEditorProps) => {
  const {
    statelessMessengerRef,
    setNoteIdsWithPendingUpdates,
    markNoteAsActive,
    markNoteAsInactive,
  } = useStatelessMessenger();
  const { isConnectedToServerRef } = useSession();

  const yDocRef = useRef<Y.Doc>(
    markNoteAsActive({ noteId, isFromEditor: true }),
  ); // `markNoteAsActive` will be called every time this component rerenders, but this is necessary because we need to ensure a ydoc is setup before executing the component's return statement

  const editorRef = useRef<TiptapEditor | null>(null);

  const [backlinksAreUpToDate, setBacklinksAreUpToDate] = useState(false);

  const currentBacklinks = useLiveQuery(async () => {
    setBacklinksAreUpToDate(false);

    const output: string[] = [];

    // query notes containing the keyword; changes to this result will recompute the live query
    const targetNotes = await db.notes
      .filter(
        (note) =>
          !!note.contentWords && note.contentWords.includes(`#${noteId}`),
      )
      .toArray();

    targetNotes.forEach((note) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");
      const targetSpans = doc.querySelectorAll(
        `span.tag[data-type="tag"][data-target-note-id="${noteId}"]`,
      );
      const parentElements = Array.from(targetSpans).map(
        (span) => span.parentElement!,
      );

      parentElements.forEach((element, index) => {
        output.push(
          `${note.id}::${
            element.classList.contains("frontmatter")
              ? ""
              : targetSpans[index].id
          }`,
        );
      });
    });

    setBacklinksAreUpToDate(true);

    return output;
  }, []);

  // insert backlink nodes for each note/block that tags the current note
  // also remove them if their target do not tag the current note
  useEffect(() => {
    if (!editorRef.current || !backlinksAreUpToDate) {
      return;
    }

    updateEditorBacklinksIfOutdated({
      currentBacklinks,
      editorRef,
    });
  }, [backlinksAreUpToDate]);

  // Inform other clients that this note is active so they can set up their own note provider to get updates
  useEffect(() => {
    const statelessMessenger = statelessMessengerRef.current;

    statelessMessenger?.setAwarenessField("currentNote", noteId);

    // collabProvider.on('unsyncedChanges', (n: number) => {
    //   console.log('Number of changes to send to server:', n);
    // });

    // Before component unmounts, mark current note as inactive and inform this change to other clients, so that they can destroy the note provider (assuming no other clients are actively working on the note)
    return () => {
      markNoteAsInactive({ noteId, isFromEditor: true });

      statelessMessenger?.setAwarenessField("currentNote", undefined);
    };
  }, []);

  return (
    <EditorProvider
      extensions={[
        ...createContentEditorExtensions({
          NotelinkNodeView,
          BacklinkNodeView,
          baseNoteSuggestionConfig: createBaseNoteSuggestionConfig(),
        }),
        Collaboration.configure({
          document: yDocRef.current,
        }),
      ]}
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onUpdate={() => {
        // diff(editor.getHTML());

        if (!editorRef.current?.isFocused) {
          return; // onUpdate handler is called once on mount; only execute below when editor is actually being edited
        }

        if (!isConnectedToServerRef.current) {
          setNoteIdsWithPendingUpdates((prev) =>
            prev.has(noteId) ? prev : new Set(prev).add(noteId),
          );
        }
      }}
    ></EditorProvider>
  );
};

export default ContentEditor;
