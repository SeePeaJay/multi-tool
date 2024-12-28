/*
  A fetch wrapper that sets auth state to false and redirects if a 401 or 500 response is encountered.
  
  This is primarily designed to block unauthorized users from accessing GET endpoints.
*/

import Cookies from "js-cookie";
import { useAuth } from "../contexts/AuthContext";
import { useSession } from "../contexts/SessionContext";

const getSessionExpiryFromCookie = () => {
  const expirationCookie = Cookies.get("expiration");
  return expirationCookie ? new Date(expirationCookie).getTime() : null;
};

export const useAuthFetch = () => {
  const { logout } = useAuth();
  const { setSessionExpiry } = useSession();

  const updateSessionExpiry = () => {
    const sessionExpiryFromCookie = getSessionExpiryFromCookie();

    if (sessionExpiryFromCookie) {
      setSessionExpiry(sessionExpiryFromCookie);
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

      updateSessionExpiry();

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

  return authFetch;
};
