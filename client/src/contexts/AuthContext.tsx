import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

interface AuthContextType {
  currentUser: string;
  setCurrentUser: (currentUser: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  /* Init state from localStorage to persist auth status across refreshes */
  const [currentUser, setCurrentUser] = useState(() => {
    const storedAuthState = localStorage.getItem("currentUser");
    return storedAuthState || "";
  });

  /* Keep localstorage/dexie up to date when currentUser changes */
  useEffect(() => {
    const saveAuthState = async () => {
      if (currentUser) {
        localStorage.setItem("currentUser", currentUser);
      } else {
        localStorage.setItem("currentUser", "");
      }
    };

    saveAuthState();
  }, [currentUser]); 

  return (
    <AuthContext.Provider
      value={{ currentUser, setCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
