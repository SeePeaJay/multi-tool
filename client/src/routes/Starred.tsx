import { generateHTML, generateJSON } from "@tiptap/core";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../db";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import InitialLoadingScreen from "../components/InitialLoadingScreen";
import Editor from "../components/Editor";
// import { createContentEditorExtensions } from "../utils/contentEditorExtensions";

function Starred() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();

  // const extensions = createContentEditorExtensions(authFetch);

  const fetchAccessTokenAndResources = async () => {
    try {
      const { code } = location.state || {};

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

      // fetch data if Starred doesn't exist, or its content is empty (due to premature refresh)
      if (!starred?.content) {
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
              hasFetchedBacklinks: false,
            }),
          ),
        );
        starred = await db.table("notes").get({ title: "Starred" });

        // fetch Starred
        // const starredContent = await authFetch(
        //   `/api/notes/${starred.id}`,
        //   { credentials: "include" }, // include cookies with request; required for cookie session to function
        // );

        // restore empty attributes, then set
        // const restoredStarredContent = generateHTML(
        //   generateJSON(starredContent, extensions),
        //   extensions,
        // );
        // await db.notes.update(starred.id, { content: restoredStarredContent });
      }

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
          <Editor />
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Starred;
