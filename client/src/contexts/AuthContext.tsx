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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // initialize state with dexie to persist auth status across refreshes
  useEffect(() => {
    const loadAuthState = async () => {
      const storedAuthState = await db.table("auth").get("isAuthenticated");
      setIsAuthenticated(storedAuthState?.value || false);
    };

    loadAuthState();
  }, []);

  // keep dexie up to date
  useEffect(() => {
    const saveAuthState = async () => {
      if (isAuthenticated) {
        await db.auth.put({ key: "isAuthenticated", value: isAuthenticated });
      } else {
        await db.auth.put({ key: "isAuthenticated", value: false });
        await db.notes.clear();
      }
    };

    saveAuthState();
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
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
