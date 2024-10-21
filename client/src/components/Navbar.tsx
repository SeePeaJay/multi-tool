import { NavLink } from "react-router-dom";
import LoginIcon from "./LoginIcon";
import StackIcon from "./StackIcon";
import StarIcon from "./StarIcon";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-white/80 backdrop-blur">
      <div className="flex items-center">
        <NavLink
          to="/notes"
          className={({ isActive }) =>
            isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
          }
        >
          <StackIcon className="ml-2" />
        </NavLink>
        <NavLink
          to="/starred"
          className={({ isActive }) =>
            isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
          }
        >
          <StarIcon className="ml-2" />
        </NavLink>
      </div>
      <div>
        <a
          href={`https://www.dropbox.com/oauth2/authorize?client_id=${import.meta.env.VITE_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_REDIRECT_URI}&response_type=code`}
          className="text-gray-400 hover:text-gray-600"
        >
          <LoginIcon className="mr-2" />
        </a>
      </div>
    </nav>
  );
}

export default Navbar;
