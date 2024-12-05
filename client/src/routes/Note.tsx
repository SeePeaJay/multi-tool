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
  const [noteId, setNoteId] = useState(""); // can't pass noteId directly because editor will be empty when going through a link

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

      if (!cachedNote?.content) {
        setIsLoading(true);

        // fetch note then set it
        const noteContent = await authFetch(
          `/api/notes/${noteIdParam}`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );

        await db.notes.update(noteIdParam, { content: noteContent });
        cachedNote = await db.table("notes").get(noteIdParam);

        setIsLoading(false);
      }

      setNoteId(noteIdParam);
      setInitialTitleEditorContent(cachedNote.title);
      setInitialContentEditorContent(cachedNote.content);
    } catch (error) {
      console.error(error);
    }
  };

  // when a different title is detected, fetch note accordingly, then pass the new title and content to child
  useEffect(() => {
    fetchNote();
    console.log(noteIdParam);
  }, [noteIdParam]);

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      {noteIdParam && (
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
