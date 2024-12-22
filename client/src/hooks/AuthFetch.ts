/*
  A fetch wrapper that sets auth state to false and redirects if a 401 or 500 response is encountered.
  
  This is primarily designed to block unauthorized users from accessing GET endpoints.
*/

import Cookies from "js-cookie";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { useTimeout } from "../contexts/TimeoutContext";

const getSessionExpiration = () => {
  const expirationCookie = Cookies.get("expiration");
  return expirationCookie ? new Date(expirationCookie).getTime() : null;
};

export const useAuthFetch = () => {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();
  const timeUntilTimeoutRef = useTimeout();

  const logout = (logoutMessage = "Session expired. Please log in again.") => {
    setIsAuthenticated(false);
    navigate("/");
    toast.error(logoutMessage, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  };

  const updateSessionTimeout = () => {
    const expirationTime = getSessionExpiration();
    if (expirationTime) {
      const timeLeft = expirationTime - Date.now();

      // clear any existing timeout, then set a new one
      if (timeLeft > 0) {
        clearTimeout(timeUntilTimeoutRef.current);

        timeUntilTimeoutRef.current = setTimeout(logout, timeLeft);
      }
    }
  };

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

      updateSessionTimeout();

      // check content-type header to determine how to process response
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      // for the time being, immediately exit upon any (server) error

      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      logout(errorMessage);
    }
  };

  useEffect(() => {
    return () => clearTimeout(timeUntilTimeoutRef.current);
  }, []);

  return authFetch;
};
