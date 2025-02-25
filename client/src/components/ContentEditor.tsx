import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import { useParams } from "react-router-dom";
import debounce from "lodash.debounce";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { createContentEditorExtensions } from "../utils/contentEditorExtensions";
import {
  updateEditorBacklinksIfOutdated,
  fetchBacklinks,
  pushEditorUpdate,
  syncEditorWithCurrentNoteContentIfOutdated,
} from "../utils/contentEditorHelpers";

const ContentEditor = () => {
  const authFetch = useAuthFetch();
  const { noteId: noteIdParam } = useParams();
  const editorRef = useRef<TiptapEditor | null>(null);
  const previousEditorContentRef = useRef("");
  const [editorIsUpToDate, setEditorIsUpToDate] = useState(false);
  const [backlinksAreUpToDate, setBacklinksAreUpToDate] = useState(false);

  const currentNoteId = useLiveQuery(async () => {
    return (
      noteIdParam || (await db.table("notes").get({ title: "Starred" }))?.id
    );
  }, [noteIdParam]);

  const currentNoteContent = useLiveQuery(async () => {
    if (!currentNoteId) {
      return;
    }

    return (await db.notes.get(currentNoteId))?.content;
  }, [currentNoteId]);

  const currentNoteHasFetchedBacklinks = useLiveQuery(async () => {
    if (!currentNoteId) {
      return;
    }

    return (await db.notes.get(currentNoteId))?.hasFetchedBacklinks;
  }, [currentNoteId]);

  const currentBacklinks = useLiveQuery(async () => {
    setBacklinksAreUpToDate(false);

    const output: string[] = [];

    // only continue if currentNoteId is ready and backlinks have been fetched
    if (
      !currentNoteId ||
      currentNoteHasFetchedBacklinks === undefined || // is undefined initially unless specified otherwise
      currentNoteHasFetchedBacklinks === false
    ) {
      return;
    }

    // query notes containing the keyword
    const targetNotes = await db.notes
      .filter(
        (note) =>
          !!note.contentWords &&
          note.contentWords.includes(`#${currentNoteId}`),
      )
      .toArray();

    targetNotes.forEach((note) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");
      const targetSpans = doc.querySelectorAll(
        `span.tag[data-type="tag"][data-target-note-id="${currentNoteId}"]`,
      );
      const parentElements = Array.from(targetSpans).map(
        (span) => span.parentElement!,
      );

      parentElements.forEach((element) => {
        output.push(
          `${note.id}::${
            element.classList.contains("frontmatter") ? "" : element.id
          }`,
        );
      });
    });

    setBacklinksAreUpToDate(true);

    return output;
  }, [currentNoteId, currentNoteHasFetchedBacklinks]);

  const pushEditorUpdateWithDelay = useCallback(
    debounce(
      async (noteIdParam: string | undefined, updatedContent: string) => {
        pushEditorUpdate({ authFetch, noteIdParam, updatedContent });
      },
      2000,
    ),
    [],
  );

  useEffect(() => {
    setEditorIsUpToDate(false);
    setBacklinksAreUpToDate(false);
  }, [noteIdParam]);

  // need this when switched to a new note or other tabs have updated note content but current tab editor isn't up to date
  useEffect(() => {
    if (!editorRef.current || currentNoteContent === undefined) {
      return;
    }

    syncEditorWithCurrentNoteContentIfOutdated({
      currentNoteContent,
      editorRef,
      previousEditorContentRef,
      setEditorIsUpToDate,
    });
  }, [currentNoteContent]);

  useEffect(
    () => {
      if (
        !currentNoteId ||
        currentNoteHasFetchedBacklinks === undefined || // is undefined initially unless specified otherwise
        currentNoteHasFetchedBacklinks === true
      ) {
        return;
      }

      fetchBacklinks({ authFetch, currentNoteId });
    },
    [currentNoteHasFetchedBacklinks],
    /* 
      can rely solely on `currentNoteHasFetchedBacklinks` because:
        * when switching to a new note for the first time, the editor is unmounted and then remounted
        * this resets `currentNoteHasFetchedBacklinks` to undefined, triggering the effect
        * we only want this effect to run once per note
    */
  );

  // insert backlink nodes for each note/block that tags the current note
  // also remove them if their target do not tag the current note
  useEffect(() => {
    if (!editorRef.current || !editorIsUpToDate || !backlinksAreUpToDate) {
      return;
    }

    updateEditorBacklinksIfOutdated({
      currentBacklinks,
      editorRef,
    });
  }, [editorIsUpToDate, backlinksAreUpToDate]);

  return (
    <EditorProvider
      // key={note?.id || "key"}
      extensions={createContentEditorExtensions(authFetch)}
      content=""
      onCreate={({ editor }) => {
        editorRef.current = editor;
      }}
      onUpdate={({ editor }) => {
        // only debounce content update if editor update involves genuinely visible changes

        // diff(editor.getHTML());

        const currentEditorContent = editor.getHTML();

        if (currentEditorContent !== previousEditorContentRef.current) {
          previousEditorContentRef.current = currentEditorContent;

          pushEditorUpdateWithDelay(noteIdParam, currentEditorContent); // passing in `noteId` ties the update to that `noteId` even if user switches to a different page before the actual update is made
        }
      }}
    ></EditorProvider>
  );
};

export default ContentEditor;
