/*
  A fetch wrapper that sets auth state to false and redirects if a 401 or 500 response is encountered.
  
  This is primarily designed to block unauthorized users from accessing GET endpoints.
*/

import { useSession } from "../contexts/SessionContext";

export const useAuthFetch = () => {
  const { logout } = useSession();

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
      // if error is caused by a page refresh which cancels the network request (this type of error isn't thrown from above code), exit early
      if (error instanceof TypeError && error.message === "NetworkError when attempting to fetch resource.") {
        console.warn("An ongoing network request was canceled.");
        return;
      }

      // otherwise, immediately exit upon any (server) error for the time being
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      logout(errorMessage);
    }
  };

  return authFetch;
};
