import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { db } from "../db";

// define shape of context
interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

// create context object
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// define provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // initialize state with localStorage to persist auth status across refreshes
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuthState = localStorage.getItem("isAuthenticated");
    return storedAuthState ? JSON.parse(storedAuthState) : false;
  });

  // keep localstorage/dexie up to date
  useEffect(() => {
    const saveAuthState = async () => {
      if (isAuthenticated) {
        localStorage.setItem(
          "isAuthenticated",
          JSON.stringify(isAuthenticated),
        );
      } else {
        localStorage.clear();
        await db.notes.clear();
      }
    };

    saveAuthState();
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// custom hook to use AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
