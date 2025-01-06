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
    const pushNote = async () => {
      // make sure to update remote ids.json file first (POST /api/notes/:noteId requires up-to-date ids.json)
      const notes = await db.notes.toArray();
      const updatedIdObject = notes.reduce(
        (acc, note) => {
          acc[note.id] = note.title;
          return acc;
        },
        {} as { [key: string]: string },
      );
      await authFetch(`/api/ids`, {
        credentials: "include", // required for cookie session to function
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updatedIdObject }),
      });

      // then, create the note remotely
      await authFetch(`/api/notes/${targetNoteId}`, {
        credentials: "include", // required for cookie session to function
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updatedContent: `<p class="frontmatter"></p><p></p>`,
        }),
      });
    };

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

          await pushNote();

          // immediately remove initialTargetTitle after using it; otherwise it persists long enough to recreate the note you just deleted
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
