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
  starredId: string;
  setStarredId: (starredId: string) => void;
}

// create context object
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// define provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // initialize state from localStorage to persist auth status across refreshes
  const [currentUser, setCurrentUser] = useState(() => {
    const storedAuthState = localStorage.getItem("currentUser");
    return storedAuthState || "";
  });

  // same idea as above; this state is used to check if call to `/api/notes` is required in Starred component
  const [starredId, setStarredId] = useState(() => {
    const storedStarredId = localStorage.getItem("starredId");
    return storedStarredId || "";
  });

  // keep localstorage/dexie up to date when state changes
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
  useEffect(() => {
    if (starredId) {
      localStorage.setItem("starredId", starredId);
    }
  }, [starredId]);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, starredId, setStarredId }}>
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
