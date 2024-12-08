import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import InitialLoadingScreen from "../components/InitialLoadingScreen";
import Editor from "../components/Editor";

function Starred() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();

  const [noteId, setNoteId] = useState("");
  const [initialTitleEditorContent, setInitialTitleEditorContent] = useState("");
  const [initialContentEditorContent, setInitialContentEditorContent] = useState("");

  const fetchAccessTokenAndResources = async () => {
    try {
      const query = new URLSearchParams(location.search);
      const code = query.get("code");

      if (code) {
        // exchange auth code for access token
        const response = await fetch(
          `/api/auth?code=${code}`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );
        console.log(response);

        if (response.ok) {
          setIsAuthenticated(true);
        }

        // redirect to clean up query string in URL
        navigate(location.pathname, { replace: true });
      }

      let starred = await db.table("notes").get({ title: "Starred" });

      if (!starred) {
        setIsLoading(true);

        // fetch then store list of notes for later usage
        const noteList = await authFetch(`/api/notes`, {
          credentials: "include",
        });
        await Promise.all(
          Object.keys(noteList).map((noteId: string) =>
            db.notes.put({
              id: noteId,
              title: noteList[noteId],
              content: "",
            }),
          ),
        );
        starred = await db.table("notes").get({ title: "Starred" });

        // fetch Starred then set it
        const starredContent = await authFetch(
          `/api/notes/${starred.id}`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );
        await db.notes.update(starred.id, { content: starredContent });
      }

      // make sure note id and editor content are set BEFORE isLoading; see Editor's isLoading check for why
      setNoteId(starred.id);
      setInitialTitleEditorContent(starred.title);
      setInitialContentEditorContent(starred.content);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAccessTokenAndResources();
  }, []);

  return (
    <>
      {isAuthenticated ? (
        <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
          <Editor
            noteId={noteId}
            initialTitleEditorContent={initialTitleEditorContent}
            initialContentEditorContent={initialContentEditorContent}
          />
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Starred;
