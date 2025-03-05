import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { db } from "../db";

const BacklinkNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  updateAttributes,
}) => {
  const { targetNoteId, targetBlockId, isLoaded } = node.attrs;

  const { noteId: noteIdParam } = useParams();
  const [editorUpdateCounter, setEditorUpdateCounter] = useState(0);

  const getBacklinksOwnerId = async () => {
    if (noteIdParam) {
      return noteIdParam; // you are in the Note route, which should have an ID at this point
    }

    const starred = await db.table("notes").get({ title: "Starred" });
    return starred?.id || null; // null bc initial load when "Starred" hasn't been fetched yet
  };

  const hasOwnerFetchedBacklinks = useLiveQuery(async () => {
    const backlinksOwnerId = await getBacklinksOwnerId();
    const note = await db.notes.get(backlinksOwnerId);

    if (note && note.hasFetchedBacklinks) {
      return true;
    }

    return false;
  }, [targetNoteId]);

  // watch for editor updates
  // necessary bc sometimes when a backlink ends up at a position occupied by an old node (via dragging or other means), somehow tiptap transmits the properties of the old node to that position
  // a refresh ensures the right data is displayed
  useEffect(() => {
    if (!editor) return;

    const handleEditorUpdate = () => {
      setEditorUpdateCounter((prev) => prev + 1);
    };

    editor.on("update", handleEditorUpdate);

    return () => {
      editor.off("update", handleEditorUpdate);
    };
  }, [editor]);

  const targetNoteTitle = useLiveQuery(
    async () => {
      const note = await db.notes.get(targetNoteId);

      if (!note) {
        return `Cannot find note with id "${targetNoteId}`;
      }

      return note.title;
    },
    [editorUpdateCounter],
    "",
  );

  const targetBlockText = useLiveQuery(
    async () => {
      const note = await db.notes.get(targetNoteId);

      if (!note) {
        return `Cannot find note with id "${targetNoteId}`;
      }

      if (!note.content) {
        return "";
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");
      const targetTag = doc.getElementById(targetBlockId);

      if (!targetTag) {
        return `Cannot find tag with id "${targetBlockId}`;
      }

      // remove id to make anchor jumping more consistent
      targetTag.removeAttribute("id");

      // find the block
      let rootElement: HTMLElement | null = targetTag;
      while (
        rootElement &&
        !["p", "h1", "h2", "h3"].includes(rootElement.tagName.toLowerCase())
      ) {
        rootElement = rootElement.parentElement;
      }

      return rootElement?.outerHTML || "Cannot find block containing the tag";
    },
    [editorUpdateCounter],
    "",
  );

  useEffect(() => {
    if (hasOwnerFetchedBacklinks) {
      updateAttributes({
        isLoaded: true,
      });
    }
  }, [hasOwnerFetchedBacklinks]);

  return (
    <NodeViewWrapper
      as="div"
      data-type="backlink"
      className={isLoaded ? "" : "pointer-events-none"} // prevent clicking the backlink until it is ready
    >
      <NavLink className="backlinkTitle" to={`/app/notes/${targetNoteId}`}>
        {targetNoteTitle}
      </NavLink>
      {targetBlockId ? (
        <HashLink
          className="blocklink"
          to={`/app/notes/${targetNoteId}#${targetBlockId}`}
          dangerouslySetInnerHTML={{
            __html:
              targetBlockText ||
              '<div class="space-y-2"><div class="h-4 bg-gray-300 rounded w-full animate-pulse"></div><div class="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div></div>',
          }}
        ></HashLink>
      ) : (
        <></>
      )}
    </NodeViewWrapper>
  );
};

export default BacklinkNodeView;
