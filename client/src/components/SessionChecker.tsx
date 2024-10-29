/*
  This is primarily designed to block unauthorized users from making delayed requests to POST endpoints, i.e. typing a note.
  
  Out of all options, the following approach appears to be the most effective so far. 
*/

import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthFetch } from "../hooks/AuthFetch";

const SessionChecker: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const authFetch = useAuthFetch();

  const checkSession = async () => {
    try {
      await authFetch("http://localhost:3000/api", {
        credentials: "include",
      });
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // add listener on access token
      window.addEventListener("focus", checkSession);

      // remove listener on expired session/logout
      return () => {
        window.removeEventListener("focus", checkSession);
      };
    }
  }, [isAuthenticated]);

  return null;
};

export default SessionChecker;
