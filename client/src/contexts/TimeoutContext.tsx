import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// define shape of context
interface TimeoutContextType {
  setSessionExpirationDate: (sessionExpirationDate: number | null) => void;
}

const TimeoutContext = createContext<TimeoutContextType | undefined>(undefined);

export const TimeoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { logout } = useAuth();
  const timeoutRef = useRef<number | undefined>(undefined);
  const [sessionExpirationDate, setSessionExpirationDate] = useState<
    number | null
  >(() => {
    const storedSessionExpiration = localStorage.getItem(
      "sessionExpirationDate",
    );
    return storedSessionExpiration ? +storedSessionExpiration : null;
  });

  useEffect(() => {
    // clear any existing timeout when sessionExpirationDate changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (sessionExpirationDate) {
      const timeUntilExpiration = sessionExpirationDate - Date.now();

      if (timeUntilExpiration > 0) {
        // set new timeout for the calculated duration
        timeoutRef.current = setTimeout(() => {
          logout();
        }, timeUntilExpiration);
      }
    }

    // cleanup function to clear timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionExpirationDate]);

  // keep localstorage/dexie up to date
  useEffect(() => {
    if (sessionExpirationDate) {
      localStorage.setItem(
        "sessionExpirationDate",
        sessionExpirationDate.toString(),
      );
    }
  }, [sessionExpirationDate]);

  return (
    <TimeoutContext.Provider value={{ setSessionExpirationDate }}>
      {children}
    </TimeoutContext.Provider>
  );
};

export const useTimeout = () => {
  const context = useContext(TimeoutContext);
  if (!context) {
    throw new Error("useTimeout must be used within a TimeoutProvider");
  }
  return context;
};
