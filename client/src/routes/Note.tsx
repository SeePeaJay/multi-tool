import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthFetch } from "../hooks/AuthFetch";
import Editor from "../components/Editor";

function Note() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { noteTitle } = useParams();
  const [editorContent, setEditorContent] = useState("");

  const fetchNote = async () => {
    if (!noteTitle) {
      navigate("/app", { replace: true });
      return;
    }

    try {
      const cachedNoteContent = localStorage.getItem(`Note:${noteTitle}`);

      if (cachedNoteContent) {
        setEditorContent(cachedNoteContent);
      } else {
        // fetch note then set it
        const noteContent = await authFetch(
          `/api/notes/${noteTitle}`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );
        localStorage.setItem(`Note:${noteTitle}`, noteContent);
        setEditorContent(noteContent);
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
      {noteTitle && <Editor title={noteTitle} content={editorContent} />}
    </div>
  );
}

export default Note;
