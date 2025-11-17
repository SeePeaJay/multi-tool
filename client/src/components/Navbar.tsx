import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";
import { useSession } from "../contexts/SessionContext";
import LoginButton from "./LoginButton";
import MoreOptionsButton from "./MoreOptionsButton";
import StackIcon from "./icons/StackIcon";
import StarIcon from "./icons/StarIcon";
import LogoutIcon from "./icons/LogoutIcon";

function Navbar() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { isLoading } = useLoading();
  const { logout } = useSession();

  return (
    <nav className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-white/80 backdrop-blur">
      <div className="flex items-center">
        <>
          <NavLink
            to="/app/notes"
            end
            className={({ isActive }) =>
              `ml-2 ${isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`
            }
          >
            <StackIcon />
          </NavLink>
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `ml-2 ${isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`
            }
          >
            <StarIcon />
          </NavLink>
        </>
      </div>
      {!isLoading &&
        (location.pathname === "/app" ||
          location.pathname.startsWith("/app/notes/")) && <MoreOptionsButton />}
      <div className="flex items-center">
        {currentUser ? (
          <span
            className="mr-2 cursor-pointer text-gray-400 hover:text-gray-600"
            onClick={() => {
              logout();
            }}
          >
            <LogoutIcon />
          </span>
        ) : (
          <div className="mr-2 mt-2">
            {/* create space for button */}
            {" "}
            <LoginButton />
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
