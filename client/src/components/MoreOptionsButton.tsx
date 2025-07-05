import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../db";
import DeleteIcon from "./icons/DeleteIcon";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";

function MoreOptionsButton() {
  const { pathname } = useLocation(); // need location instead of params bc params are actually not dynamic
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const [shouldShowMenu, setShouldShowMenu] = useState(false);
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const { metadataYdocRef } = useStatelessMessenger();

  const displayedNoteTitle = useLiveQuery(async () => {
    if (pathname === "/app") {
      return "Starred";
    }

    const noteIdParam = pathname.split("/")[3];
    const noteTitle = (await db.notes.get(noteIdParam))?.title;

    return noteTitle && noteTitle.length > 30
      ? noteTitle.slice(0, 30) + "..."
      : noteTitle;
  }, [pathname]);

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
    const noteIdToDelete = pathname.replace("/app/notes/", "");
    const noteMetadata = metadataYdocRef.current.getMap("noteMetadata");

    setShouldShowModal(false);

    noteMetadata.delete(noteIdToDelete); // this triggers delete-specific behavior
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

  return (
    <div className="dropdown">
      <div
        ref={buttonRef}
        role="button"
        className={`btn btn-sm relative -left-4 z-10 text-gray-400 ${shouldShowMenu ? "" : "btn-ghost"}`}
        onClick={() => setShouldShowMenu(!shouldShowMenu)}
      >
        {displayedNoteTitle}
      </div>
      <ul
        ref={menuRef}
        className={`menu !fixed left-2/4 top-[40px] z-[1] w-52 -translate-x-2/4 rounded-box border border-solid border-gray-100 bg-base-100 p-1.5 shadow-lg ${shouldShowMenu ? "" : "invisible"}`}
      >
        <li
          className={`${displayedNoteTitle !== "Starred" ? "" : "invisible"}`}
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
          Are you sure you want to delete "{displayedNoteTitle}"?
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
