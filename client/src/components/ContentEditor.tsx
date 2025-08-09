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
    currentEditorNoteId,
    setNoteIdsWithPendingUpdates,
    markNoteAsActive,
    markNoteAsInactive,
  } = useStatelessMessenger();
  const { isConnectedToServerRef } = useSession();

  const editorRef = useRef<TiptapEditor | null>(null);
  const [editorIsReady, setEditorIsReady] = useState(false);

  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);

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

  // Update backlinks only until editorRef has a value and the backlinks for this noteId are computed
  useEffect(() => {
    if (!editorIsReady || !backlinksAreUpToDate) {
      return;
    }

    updateEditorBacklinksIfOutdated({
      currentBacklinks,
      editorRef,
    });
  }, [editorIsReady, backlinksAreUpToDate]);

  return ydoc ? ( // only render until ydoc is ready
    <EditorProvider
      extensions={[
        ...createContentEditorExtensions({
          NotelinkNodeView,
          BacklinkNodeView,
          baseNoteSuggestionConfig: createBaseNoteSuggestionConfig(),
        }),
        Collaboration.configure({
          document: ydoc,
        }),
      ]}
      onCreate={({ editor }) => {
        editorRef.current = editor;
        setEditorIsReady(true);
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
  ) : null;
};

export default ContentEditor;
