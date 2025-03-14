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
  currentUser: string;
  setCurrentUser: (currentUser: string) => void;
}

// create context object
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// define provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // initialize state with localStorage to persist auth status across refreshes
  const [currentUser, setCurrentUser] = useState(() => {
    const storedAuthState = localStorage.getItem("currentUser");
    return storedAuthState || "";
  });

  // keep localstorage/dexie up to date
  useEffect(() => {
    const saveAuthState = async () => {
      if (currentUser) {
        localStorage.setItem("currentUser", currentUser);
      } else {
        localStorage.clear();
        await db.notes.clear();
      }
    };

    saveAuthState();
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
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
