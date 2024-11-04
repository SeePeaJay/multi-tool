/*
  A fetch wrapper that sets auth state to false and redirects if a 401 or 500 response is encountered.
  
  This is primarily designed to block unauthorized users from accessing GET endpoints.
*/

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

export const useAuthFetch = () => {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const authFetch = async (url: string, options = {}) => {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new Error("Unauthorized access. Please log in again.");
          case 500:
            throw new Error("Server error. Please try again later.");
          default:
            throw new Error(`Unexpected error: ${response.statusText}`);
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
      // for the time being, immediately exit upon any (server) error

      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      setIsAuthenticated(false);
      navigate("/");
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };

  return authFetch;
};
