import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

// define shape of context
interface SessionContextType {
  isConnectedToServer: boolean;
  setIsConnectedToServer: React.Dispatch<React.SetStateAction<boolean>>;
  logout: (logoutMessage?: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [isConnectedToServer, setIsConnectedToServer] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();

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
      fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      setCurrentUser("");

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
    if (!currentUser) {
      return;
    }

    async function checkSession() {
      const res = await fetch("/api", { credentials: "include" });

      if (res.status !== 200) {
        logout();
      }
    }

    // start polling
    intervalRef.current = setInterval(checkSession, 10000);

    // clean up on logout/unmount
    return () => clearInterval(intervalRef.current);
  }, [currentUser]);

  return (
    <SessionContext.Provider value={{ isConnectedToServer, setIsConnectedToServer, logout }}>
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
