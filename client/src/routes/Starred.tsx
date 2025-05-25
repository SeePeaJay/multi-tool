import { useEffect } from "react";
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
  const { currentUser, setCurrentUser, starredId, setStarredId } = useAuth();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();

  const fetchInitialResources = async () => {
    try {
      const { code } = location.state || {};

      if (code) {
        // exchange auth code to auth
        const response = await fetch(
          `/api/auth?code=${code}`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );
        const { userId }: { userId: string } = await response.json();
        // console.log(response, userId);

        if (response.ok) {
          setCurrentUser(userId);
        }

        // redirect to clean up query string in URL
        navigate(location.pathname, { replace: true });
      }

      // if starred id hasn't been set yet, fetch notes then store them
      if (!starredId) {
        setIsLoading(true);

        const noteList = await authFetch(`/api/notes`, {
          credentials: "include",
        });

        await Promise.all(
          Object.keys(noteList).map((noteId: string) =>
            db.notes.put({
              id: noteId,
              title: noteList[noteId].title,
              content: noteList[noteId].content,
              ydocArray: noteList[noteId].ydocArray,
              hasFetchedBacklinks: false,
            }),
          ),
        );

        setStarredId((await db.table("notes").get({ title: "Starred" }))?.id);
      }

      setIsLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchInitialResources();
  }, []);

  return (
    <>
      {currentUser && starredId ? (
        <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
          <Editor noteId={starredId}/>
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Starred;
