import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";
import { useLoading } from "../contexts/LoadingContext";
import Editor from "../components/Editor";

function Note() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();
  const { noteTitle } = useParams();
  const [noteId, setNoteId] = useState("");
  const [editorContent, setEditorContent] = useState("");

  const fetchNote = async () => {
    if (!noteTitle) {
      navigate("/app", { replace: true });
      return;
    }

    try {
      const cachedNote = await db.table("notes").get({ title: noteTitle });

      if (cachedNote?.content) {
        setNoteId(cachedNote.id);
        setEditorContent(cachedNote.content);
      } else {
        setIsLoading(true);

        // fetch note then set it
        const noteData = await authFetch(
          `/api/notes/${noteTitle}`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );

        await db.notes.put({ id: cachedNote?.id || noteData.newNoteId, title: noteTitle, content: noteData.content });
        setNoteId(cachedNote?.id || noteData.newNoteId);
        setEditorContent(noteData.content);

        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // when a different title is detected, fetch note accordingly, then pass the new title and content to child
  useEffect(() => {
    fetchNote();
  }, [noteTitle]);

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      {noteTitle && <Editor noteId={noteId} title={noteTitle} content={editorContent} />}
    </div>
  );
}

export default Note;
