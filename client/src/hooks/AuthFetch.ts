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

      // for the time being, immediately exit upon any server error code
      if (!response.ok) {
        setIsAuthenticated(false);
        navigate("/");
        toast.error(`Network response was not ok! Error code: ${response.status}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });

        return; // exit early to avoid further processing
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
