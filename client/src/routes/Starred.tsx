import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import { useLoading } from "../contexts/LoadingContext";
import LoadingScreen from "../components/LoadingScreen";
import Editor from "../components/Editor";

function Starred() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();
  const [editorContent, setEditorContent] = useState("");

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

      const cachedStarred = await db.table("notes").get("Starred");

      if (cachedStarred) {
        setEditorContent(cachedStarred.content);
      } else {
        setIsLoading(true);

        // fetch then store list of notes for later usage
        const noteList = await authFetch(`/api/notes`, {
          credentials: "include",
        });
        await Promise.all(
          noteList.map((noteTitle: string) =>
            db.notes.put({
              key: noteTitle,
              content: "",
            }),
          ),
        );

        // fetch Starred then set it
        const starredContent = await authFetch(
          `/api/notes/Starred`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );
        await db.notes.put({ key: "Starred", content: starredContent });
        setEditorContent(starredContent);

        setIsLoading(false);
      }
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
          <Editor title="Starred" content={editorContent} />
        </div>
      ) : (
        <LoadingScreen />
      )}
    </>
  );
}

export default Starred;
