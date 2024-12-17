import { useEffect, useState } from "react";
import { HashLink } from "react-router-hash-link";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";

interface NotelinkNodeViewProps {
  node: ProseMirrorNode;
}

const NotelinkNodeView = ({ node }: NotelinkNodeViewProps) => {
  const authFetch = useAuthFetch();
  const [targetTitle, setTargetTitle] = useState<string>("");

  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const { targetNoteId, targetBlockId, initialTargetTitle } = node.attrs;

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
        }
      } catch (error) {
        console.error("Error fetching note title:", error);
      }
    };

    displayTargetTitle();
  }, []);

  return (
    <NodeViewWrapper as="span" className={`${node.attrs.type} ${targetTitle === "" ? "text-blue-100" : ""}`}>
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
