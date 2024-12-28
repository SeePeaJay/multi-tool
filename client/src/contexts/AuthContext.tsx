import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { db } from "../db";

// define shape of context
interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: (logoutMessage?: string) => void;
}

// create context object
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// define provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();

  // initialize state with localStorage to persist auth status across refreshes
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuthState = localStorage.getItem("isAuthenticated");
    return storedAuthState ? JSON.parse(storedAuthState) : false;
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

  const logout = (logoutMessage = "Session expired. Please log in again.") => {
    try {
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
      value={{ isAuthenticated, setIsAuthenticated, logout }}
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
