/* We need a method to prevent users from writing notes down and then encountering API failures due to expired sessions. This approach appears to be the most effective solution so far. */

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
      console.log("LIstener added");

      // remove listener on expired session/logout
      return () => {
        window.removeEventListener("focus", checkSession);
        console.log("LIstener removed");
      };
    }
  }, [isAuthenticated]);

  return null;
};

export default SessionChecker;
