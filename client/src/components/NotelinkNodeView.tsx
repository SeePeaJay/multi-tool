import { useEffect, useState } from "react";
import { HashLink } from "react-router-hash-link";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { db, Note } from "../db";
import { useSSE } from "../contexts/SSEContext";
import { useAuthFetch } from "../hooks/AuthFetch";

const NotelinkNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const authFetch = useAuthFetch();
  const { rerenderTrigger } = useSSE();

  const [targetTitle, setTargetTitle] = useState("");

  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const { targetNoteId, targetBlockId, initialTargetTitle } = node.attrs;

  // listen for local title renames, and update title accordingly
  useEffect(() => {
    const updatingHandler = async (
      modifications: Partial<Note>,
      primaryKey: string,
    ) => {
      if (primaryKey === targetNoteId && modifications.title) {
        setTargetTitle(modifications.title);
      }
    };

    db.notes.hook("updating", updatingHandler);

    return () => db.notes.hook("updating").unsubscribe(updatingHandler); // cleanup
  }, []);

  // on start, find the target title for this notelink/tag to display
  useEffect(() => {
    const displayTargetTitle = async () => {
      try {
        const cachedNote = await db.notes.get(targetNoteId);

        if (cachedNote) {
          setTargetTitle(cachedNote.title);
        } else if (initialTargetTitle) {
          setTargetTitle(initialTargetTitle);

          // add a new note entry to dexie
          await db.notes.put({
            id: targetNoteId,
            title: initialTargetTitle,
            content: `<p class="frontmatter"></p><p></p>`,
          });

          await authFetch(`/api/create/${targetNoteId}`, {
            credentials: "include", // required for cookie session to function
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: initialTargetTitle,
            }),
          });

          // immediately remove initialTargetTitle after using it; otherwise it persists long enough to recreate the note you just deleted; this also causes an additional update request as a side effect
          updateAttributes({
            initialTargetTitle: "",
          });
        } else {
          // if neither, could be that the note has just been deleted; need to update displayed title accordingly
          setTargetTitle("");
        }
      } catch (error) {
        console.error("Error fetching note title:", error);
      }
    };

    displayTargetTitle();
  }, [rerenderTrigger]);

  return (
    <NodeViewWrapper
      as="span"
      className={`${node.attrs.type} ${targetTitle === "" ? "text-blue-100" : ""}`}
    >
      {targetTitle === "" ? (
        <>Cannot find note with id "{targetNoteId}"</>
      ) : (
        <HashLink
          to={`/app/notes/${targetNoteId}${targetBlockId ? `#${targetBlockId}` : ""}`}
        >
          {suggestionChar === "[["
            ? `${suggestionChar}${targetTitle}${targetBlockId ? `::${targetBlockId}` : ""}]]`
            : `${suggestionChar}${targetTitle}`}
        </HashLink>
      )}
    </NodeViewWrapper>
  );
};

export default NotelinkNodeView;
