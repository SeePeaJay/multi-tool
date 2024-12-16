import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../db";
import DeleteIcon from "./icons/DeleteIcon";

function MoreOptionsButton() {
  const location = useLocation();
  const buttonRef = useRef(null);

  const [displayedTitle, setDisplayedTitle] = useState("");
  const [shouldShowMenu, setShouldShowMenu] = useState(false);

  const toggleMenu = () => {
    setShouldShowMenu(!shouldShowMenu);
  };
  const handleClickOutside = (event: Event) => {
    if (
      buttonRef.current &&
      !(buttonRef.current as Node).contains(event.target as Node)
    ) {
      setShouldShowMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (shouldShowMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [shouldShowMenu]);

  useEffect(() => {
    async function updateDisplayedTitle() {
      const currentNoteId = location.pathname.startsWith("/app/notes/")
        ? location.pathname.replace("/app/notes/", "")
        : "";

      if (currentNoteId) {
        const currentNote = await db.notes.get(currentNoteId);
        const currentTitle = currentNote!.title;

        setDisplayedTitle(
          currentTitle.length > 30
            ? currentTitle.slice(0, 30) + "..."
            : currentTitle,
        );
      } else {
        setDisplayedTitle("Starred");
      }
    }

    updateDisplayedTitle();
  }, [location.pathname]);

  return (
    <div className="dropdown">
      <div
        ref={buttonRef}
        role="button"
        className={`btn btn-sm relative -left-4 z-10 text-gray-400 ${shouldShowMenu ? "" : "btn-ghost"}`}
        onClick={toggleMenu}
      >
        {displayedTitle}
      </div>
      {shouldShowMenu && (
        <ul
          className="menu !fixed left-2/4 top-[40px] z-[1] w-52 -translate-x-2/4 rounded-box border border-solid border-gray-100 bg-base-100 p-1.5 shadow-lg"
        >
          {displayedTitle !== "Starred" && (
            <li>
              <a className="p-1">
                <DeleteIcon />
                Delete
              </a>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default MoreOptionsButton;
