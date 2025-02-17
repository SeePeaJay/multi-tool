import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useCallback } from "react";
import { EditorProvider, Editor as TiptapEditor } from "@tiptap/react";
import { useParams } from "react-router-dom";
import debounce from "lodash.debounce";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { createContentEditorExtensions } from "../utils/contentEditorExtensions";

const ContentEditor = () => {
  const authFetch = useAuthFetch();
  const { noteId: noteIdParam } = useParams();
  const editorRef = useRef<TiptapEditor | null>(null);
  const previousEditorContentRef = useRef("");

  const noteContentToDisplay = useLiveQuery(async () => {
    if (noteIdParam) {
      const note = await db.notes.get(noteIdParam);
      return note?.content;
    }

    const starred = await db.table("notes").get({ title: "Starred" });
    return starred?.content;
  }, [noteIdParam]);

  // debounce the content change handler
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

  // const diff = useCallback((html: string) => {
  //   setContent(editor.getJSON());
  //   const currentImages = [];
  //   const deletedImages = previousImages.filter(
  //     (url) => !currentImages.includes(url),
  //   );
  //   for (const url of deletedImages) {
  //     console.log("Deleting image from blob storage:", url);
  //     await fetch(`/api/upload/delete?url=${encodeURIComponent(url)}`, {
  //       method: "DELETE",
  //     });
  //   }
  //   setPreviousImages(currentImages);
  //   setImagesList(currentImages);

  //   const parser = new DOMParser();
  //   const doc = parser.parseFromString(html, "text/html");
  //   const backlinkListDivs = doc.querySelectorAll("div.backlinkList");
  //   const targetNoteIds = Array.from(
  //     new Set(
  //       Array.from(backlinkListDivs).map((div) =>
  //         div.getAttribute("data-target-note-id"),
  //       ),
  //     ),
  //   );
  //   console.log(targetNoteIds);
  // }, []);

  // need this when switched to a new note or other tabs have updated note content but current tab editor isn't up to date
  useEffect(() => {
    async function updateEditorDisplayIfOutdated() {
      if (editorRef.current && noteContentToDisplay) {
        // setTimeout is necessary to avoid the error message: "Warning: flushSync was called from inside a
        // lifecycle method. ..."
        setTimeout(() => {
          const currentEditorContent = editorRef.current!.getHTML();

          if (currentEditorContent !== noteContentToDisplay) {
            editorRef.current!.commands.clearContent(); // need this for next line to function consistently
            editorRef.current!.commands.setContent(noteContentToDisplay);
            previousEditorContentRef.current = noteContentToDisplay;
          }
        });
      }
    }

    updateEditorDisplayIfOutdated();
  }, [noteContentToDisplay]);

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
