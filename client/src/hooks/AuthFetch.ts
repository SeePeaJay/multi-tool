/*
  A fetch wrapper that sets auth state to false and redirects if a 401 or 500 response is encountered.
  
  This is primarily designed to block unauthorized users from accessing GET endpoints.
*/


import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const useAuthFetch = () => {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const authFetch = async (url: string, options = {}) => {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 401 || response.status === 500) {
          setIsAuthenticated(false);
          navigate("/");
          return; // exit early to avoid further processing
        } else {
          throw new Error("Network response was not ok");
        }
      }

      // check content-type header to determine how to process response
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  };

  return authFetch;
};
