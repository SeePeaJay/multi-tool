import { useEffect, useState } from "react";
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
  const { currentUser, setCurrentUser } = useAuth();
  const authFetch = useAuthFetch();
  const { setIsLoading } = useLoading();

  const [starredId, setStarredId] = useState<string | null>(null);

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

      // fetch then store list of notes on initial load
      const starred = await db.table("notes").get({ title: "Starred" });
      if (!starred?.hasFetchedBacklinks) {
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
      }

      // ensure starred id ref is set
      if (!starredId) {
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
