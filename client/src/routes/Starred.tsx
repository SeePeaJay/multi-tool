import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import LoadingScreen from "../components/LoadingScreen";
import Editor from "../components/Editor";

function Starred() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const authFetch = useAuthFetch();

  const [editorContent, setEditorContent] = useState("");

  const fetchAccessTokenAndStarred = async () => {
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

      const cachedStarredContent = localStorage.getItem("Note:Starred");

      if (cachedStarredContent) {
        setEditorContent(cachedStarredContent);
      } else {
        const starredContent = await authFetch(
          `/api/starred`,
          { credentials: "include" }, // include cookies with request; required for cookie session to function
        );

        localStorage.setItem("Note:Starred", starredContent);
        setEditorContent(starredContent);
        console.log(starredContent);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAccessTokenAndStarred();
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
