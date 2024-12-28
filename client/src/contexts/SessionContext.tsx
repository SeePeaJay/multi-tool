import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// define shape of context
interface SessionContextType {
  setSessionExpiry: (sessionExpiry: number | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { logout } = useAuth();
  const timeoutRef = useRef<number | undefined>(undefined);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(() => {
    const storedTime = localStorage.getItem("sessionExpiry");
    return storedTime ? +storedTime : null;
  });

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
          logout();
        }, timeUntilExpiry);
      } else {
        logout();
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
    <SessionContext.Provider value={{ setSessionExpiry }}>
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
