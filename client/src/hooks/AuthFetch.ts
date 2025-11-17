/*
 * A fetch wrapper that sets auth state to false and redirects if a 401 or 500 response is encountered.
 * This is primarily designed to block unauthorized users from accessing GET endpoints.
 */

import { useSession } from "../contexts/SessionContext";

class ApiError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "SERVER" | "UNEXPECTED",
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const useAuthFetch = () => {
  const { logout } = useSession();

  const authFetch = async (url: string, options = {}) => {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new ApiError(
              "UNAUTHORIZED",
              "Unauthorized access. Please log in again.",
            );
          case 500:
            throw new ApiError(
              "SERVER",
              "Server error. Please try again later.",
            );
          default:
            throw new ApiError(
              "UNEXPECTED",
              `Unexpected error: ${response.statusText}`,
            );
        }
      }

      /* Check content-type header to determine how to process response */
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      /* If error is caused by a page refresh which cancels the network request (this type of error isn't thrown from above code), exit early */
      if (
        error instanceof TypeError &&
        error.message === "NetworkError when attempting to fetch resource."
      ) {
        console.warn("An ongoing network request was canceled.");
      }

      /* Otherwise, logout if auth error */
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
        logout(error.message);
      }
    }
  };

  return authFetch;
};
