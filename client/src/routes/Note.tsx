import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { useLoading } from "../contexts/LoadingContext";
import Editor from "../components/Editor";

function Note() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();
  const { noteId: noteIdParam } = useParams();
  const [noteId, setNoteId] = useState(""); // can't pass noteIdParam directly; see return statement comments for why

  const [initialTitleEditorContent, setInitialTitleEditorContent] =
    useState("");
  const [initialContentEditorContent, setInitialContentEditorContent] =
    useState("");

  const fetchNote = async () => {
    if (!noteIdParam) {
      navigate("/app", { replace: true });
      return;
    }

    try {
      let cachedNote = await db.table("notes").get(noteIdParam);

      // fetch note then set it
      if (!cachedNote?.content) {
        setIsLoading(true);

        const noteContent = await authFetch(`/api/notes/${noteIdParam}`, {
          credentials: "include",
        });

        await db.notes.update(noteIdParam, { content: noteContent });
        cachedNote = await db.table("notes").get(noteIdParam);

        setIsLoading(false);
      }

      // make sure editor content is set BEFORE noteId is set, for return statement below
      setInitialTitleEditorContent(cachedNote.title);
      setInitialContentEditorContent(cachedNote.content);
      setNoteId(noteIdParam);
    } catch (error) {
      console.error(error);
    }
  };

  // when a different title id param is detected, fetch note accordingly
  useEffect(() => {
    fetchNote();
    console.log(noteIdParam);
  }, [noteIdParam]);

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      {noteId && ( // the && expression ensures Editor is only rendered after all the props are ready
        // not using noteIdParam because content props are still empty by the time noteIdParam is true; we'll cause unnecessary rerender
        // we should instead use noteId, but we have to make sure it's only set AFTER editor content is ready
        <Editor
          noteId={noteId}
          initialTitleEditorContent={initialTitleEditorContent}
          initialContentEditorContent={initialContentEditorContent}
        />
      )}
    </div>
  );
}

export default Note;
