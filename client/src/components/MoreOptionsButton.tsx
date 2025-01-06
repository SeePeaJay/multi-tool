import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../db";
import { useSSE } from "../contexts/SSEContext";
import { useAuthFetch } from "../hooks/AuthFetch";
import DeleteIcon from "./icons/DeleteIcon";

function MoreOptionsButton() {
  const authFetch = useAuthFetch();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useSSE();

  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [shouldShowMenu, setShouldShowMenu] = useState(false);
  const [shouldShowModal, setShouldShowModal] = useState(false);

  // can't just rely on `handleClickOutsideOfButtonAndMenu` to close the menu after deleting, since the delete handler won't be called
  const hideMenuAndShowModal = () => {
    setShouldShowMenu(false);
    setShouldShowModal(true);
  };

  const handleClickOutsideOfButtonAndMenu = (event: Event) => {
    if (
      buttonRef.current &&
      menuRef.current &&
      !(buttonRef.current as Node).contains(event.target as Node) &&
      !(menuRef.current as Node).contains(event.target as Node)
    ) {
      setShouldShowMenu(false);
    }
  };

  const handleClickOutsideOfModal = (event: Event) => {
    if (
      modalRef.current &&
      !(modalRef.current as Node).contains(event.target as Node)
    ) {
      setShouldShowModal(false);
    }
  };

  const deleteNote = async () => {
    setShouldShowModal(false);
    navigate("/app/notes", { replace: true });

    try {
      const noteIdToDelete = location.pathname.replace("/app/notes/", "");

      await db.notes.delete(noteIdToDelete);
      await authFetch(
        `/api/delete/${noteIdToDelete}`,
        {
          credentials: "include",
          method: "POST",
        },
      );
      authFetch(`/api/broadcast`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ initiator: sessionId }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutsideOfButtonAndMenu);
    document.addEventListener("mousedown", handleClickOutsideOfModal);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutsideOfButtonAndMenu,
      );
      document.removeEventListener("mousedown", handleClickOutsideOfModal);
    };
  }, []);

  useEffect(() => {
    if (shouldShowMenu || shouldShowModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [shouldShowMenu, shouldShowModal]);

  useEffect(() => {
    async function updateDisplayedTitle() {
      const noteIdFromCurrentRoute = location.pathname.startsWith("/app/notes/")
        ? location.pathname.replace("/app/notes/", "")
        : "";

      if (noteIdFromCurrentRoute) {
        const currentNote = await db.notes.get(noteIdFromCurrentRoute);
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
        onClick={() => setShouldShowMenu(!shouldShowMenu)}
      >
        {displayedTitle}
      </div>
      <ul
        ref={menuRef}
        className={`menu !fixed left-2/4 top-[40px] z-[1] w-52 -translate-x-2/4 rounded-box border border-solid border-gray-100 bg-base-100 p-1.5 shadow-lg ${shouldShowMenu ? "" : "invisible"}`}
      >
        <li
          className={`${displayedTitle !== "Starred" ? "" : "invisible"}`}
          onClick={hideMenuAndShowModal}
        >
          <a className="p-1">
            <DeleteIcon />
            Delete
          </a>
        </li>
      </ul>
      <div
        ref={modalRef}
        className={`modal-box fixed left-2/4 z-10 -translate-x-2/4 border border-solid border-gray-100 ${shouldShowModal ? "" : "invisible"}`}
      >
        <h3 className="text-center text-lg font-bold">
          Are you sure you want to delete "{displayedTitle}"?
        </h3>
        <div className="flex justify-center">
          <button className="btn btn-error btn-sm" onClick={deleteNote}>
            Confirm
          </button>
          <>&nbsp;</>
          <button
            className="btn btn-sm"
            onClick={() => setShouldShowModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default MoreOptionsButton;
