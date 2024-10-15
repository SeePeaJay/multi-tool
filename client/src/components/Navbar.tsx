import LoginIcon from "./LoginIcon";
import StackIcon from "./StackIcon";
import StarIcon from "./StarIcon";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-white/80 backdrop-blur">
      <div className="flex items-center">
        <StackIcon className="ml-2"/>
        <StarIcon className="ml-2"/>
      </div>
      <div>
        <LoginIcon className="mr-2"/>
      </div>
    </nav>
  );
}

export default Navbar;
