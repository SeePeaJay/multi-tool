import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import StackIcon from "./StackIcon";
import StarIcon from "./StarIcon";
import LoginIcon from "./LoginIcon";
import LogoutIcon from "./LogoutIcon";

function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useAuth();

  const logout = async () => {
    try {
      await fetch("http://localhost:3000/api/logout", { method: "POST", credentials: "include" });

      setIsAuthenticated(false);

      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-white/80 backdrop-blur">
      <div className="flex items-center">
        {isAuthenticated ? (
          <>
            <NavLink
              to="/app/notes"
              className={({ isActive }) =>
                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }
            >
              <StackIcon className="ml-2" />
            </NavLink>
            <NavLink
              to="/app/starred"
              className={({ isActive }) =>
                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }
            >
              <StarIcon className="ml-2" />
            </NavLink>
          </>
        ) : (
          <></>
        )}
      </div>
      <div>
        {isAuthenticated ? (
          <span onClick={logout}>
            <LogoutIcon className="mr-2 cursor-pointer text-gray-400 hover:text-gray-600" />
          </span>
        ) : (
          <a
            href={`https://www.dropbox.com/oauth2/authorize?client_id=${import.meta.env.VITE_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_REDIRECT_URI}&response_type=code`}
            className="text-gray-400 hover:text-gray-600"
          >
            <LoginIcon className="mr-2" />
          </a>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
