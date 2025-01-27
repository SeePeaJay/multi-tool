import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

// define shape of context
interface SessionContextType {
  setSessionExpiry: (sessionExpiry: number | null) => void;
  logout: (logoutMessage?: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const timeoutRef = useRef<number | undefined>(undefined);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(() => {
    const storedTime = localStorage.getItem("sessionExpiry");
    return storedTime ? +storedTime : null;
  });

  const showToastError = (message: string) => {
    toast.error(message, {
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

  const logout = (logoutMessage?: string) => {
    try {
      clearTimeout(timeoutRef.current);

      fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      setIsAuthenticated(false);

      navigate("/");

      if (logoutMessage) {
        showToastError(logoutMessage);
      }
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error(error);
      showToastError(errorMessage);
    }
  };

  useEffect(() => {
    // clear any existing timeout when sessionExpiry changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // either setup new timeout, or just logout if already expired
    if (sessionExpiry) {
      const timeUntilExpiry = sessionExpiry - Date.now();
      // console.log(sessionExpiry, timeUntilExpiry);

      if (timeUntilExpiry > 0) {
        timeoutRef.current = setTimeout(() => {
          logout("Session expired. Please log in again.");
        }, timeUntilExpiry);
      } else {
        logout("Session expired. Please log in again.");
      }
    }

    // cleanup function to clear timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionExpiry]);

  // keep localstorage/dexie up to date
  useEffect(() => {
    if (sessionExpiry) {
      localStorage.setItem("sessionExpiry", sessionExpiry.toString());
    }
  }, [sessionExpiry]);

  return (
    <SessionContext.Provider value={{ setSessionExpiry, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
