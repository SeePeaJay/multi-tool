import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import { useParams } from "react-router-dom";
import debounce from "lodash.debounce";
import isEqual from "lodash.isequal";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { createContentEditorExtensions } from "../utils/contentEditorExtensions";

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

  const debounceContentUpdate = useCallback(
    debounce(
      async (noteIdParam: string | undefined, updatedContent: string) => {
        let noteIdToUpdate = noteIdParam;

        if (!noteIdToUpdate) {
          const starred = await db.table("notes").get({ title: "Starred" });
          noteIdToUpdate = starred.id;
        }

        try {
          await db.notes.update(noteIdToUpdate!, {
            content: updatedContent,
          });
        } catch (error) {
          console.error("Failed to save content:", error);
        }

        await authFetch(
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
    async function updateEditorContentIfOutdated() {
      if (editorRef.current && currentNoteContent) {
        // setTimeout is necessary to avoid the error message: "Warning: flushSync was called from inside a
        // lifecycle method. ..."
        setTimeout(() => {
          const currentEditorContent = editorRef.current!.getHTML();

          if (currentEditorContent !== currentNoteContent) {
            setEditorIsUpToDate(false);
            editorRef.current!.commands.clearContent(); // need this for next line to function consistently
            editorRef.current!.commands.setContent(currentNoteContent);
            previousEditorContentRef.current = currentNoteContent;
            setEditorIsUpToDate(true);
          }
        });
      }
    }

    updateEditorContentIfOutdated();
  }, [currentNoteContent]);

  useEffect(
    () => {
      const fetchBacklinks = async () => {
        // fetch notes that tag current note
        const response = await authFetch(`/api/search`, {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: `#${currentNoteId}` }),
        });

        // update Dexie
        await Promise.all(
          response.map((note: { id: string; content: string }) =>
            db.notes.update(note.id, {
              content: note.content,
            }),
          ),
        );
        await db.notes.update(currentNoteId, {
          hasFetchedBacklinks: true,
        });
      };

      if (
        !currentNoteId ||
        currentNoteHasFetchedBacklinks === undefined || // is undefined initially unless specified otherwise
        currentNoteHasFetchedBacklinks === true
      ) {
        return;
      }

      fetchBacklinks();
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
    const backlinksFromEditor: Record<
      string,
      Array<{ pos: number; size: number }>
    > = {};

    if (!editorRef.current || !editorIsUpToDate || !backlinksAreUpToDate) {
      return;
    }

    // populate backlinksFromEditor
    editorRef.current.state.doc.descendants((node, pos) => {
      if (node.type.name === "backlink") {
        const { targetNoteId, targetBlockId } = node.attrs;

        if (!backlinksFromEditor[`${targetNoteId}::${targetBlockId}`]) {
          backlinksFromEditor[`${targetNoteId}::${targetBlockId}`] = [];
        }

        backlinksFromEditor[`${targetNoteId}::${targetBlockId}`].push({
          pos,
          size: node.nodeSize,
        });
      }
    });

    // convert to sets for comparison
    const [setOfBacklinks, setOfBacklinksFromEditor] = [
      new Set(currentBacklinks),
      new Set(Object.keys(backlinksFromEditor)),
    ];

    // diff the sets and create/remove backlinks accordingly
    if (
      currentBacklinks && // backlinks can be undefined initially
      !isEqual(setOfBacklinks, setOfBacklinksFromEditor)
    ) {
      const backlinksToCreate = Array.from(
        setOfBacklinks.difference(setOfBacklinksFromEditor),
      );
      const backlinksToRemove = Array.from(
        setOfBacklinksFromEditor.difference(setOfBacklinks),
      );

      backlinksToRemove.forEach((backlink) => {
        const posAndSizeOfBacklink = backlinksFromEditor[backlink];
        const { tr } = editorRef.current!.state;

        posAndSizeOfBacklink.forEach(({ pos, size }) => {
          tr.delete(pos, pos + size);
        });

        editorRef.current!.view.dispatch(tr);
      });

      backlinksToCreate.forEach((backlink) => {
        setTimeout(() => {
          const [targetNoteId, targetBlockId] = backlink.split("::");

          const endPosition = editorRef.current!.state.doc.content.size;
          editorRef.current!.commands.insertContentAt(
            endPosition,
            `<div class="backlink" data-target-note-id="${targetNoteId}" data-target-block-id="${targetBlockId}">${targetBlockId}</div>`,
          );
        });
      });
    }
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

          debounceContentUpdate(noteIdParam, currentEditorContent); // passing in `noteId` ties the update to that `noteId` even if user switches to a different page before the actual update is made
        }
      }}
    ></EditorProvider>
  );
};

export default ContentEditor;
