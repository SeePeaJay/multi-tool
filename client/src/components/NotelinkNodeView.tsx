import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { HashLink } from "react-router-hash-link";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";

const NotelinkNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const authFetch = useAuthFetch();
  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const {
    targetNoteId,
    targetBlockId,
    initialTargetTitle,
    blockIndexForNewBlockId,
  } = node.attrs;
  const note = useLiveQuery(() => db.notes.get(targetNoteId), [targetNoteId]);

  useEffect(() => {
    const createNoteIfNew = async () => {
      try {
        if (initialTargetTitle) {
          // add a new note entry to dexie
          await db.notes.put({
            id: targetNoteId,
            title: initialTargetTitle,
            content: `<p class="frontmatter"></p><p></p>`,
            hasFetchedBacklinks: true,
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

          // immediately remove initialTargetTitle after using it; otherwise it can persist to recreate the note you just deleted; this also causes an additional update request as a side effect
          updateAttributes({
            initialTargetTitle: "",
          });
        }
      } catch (error) {
        console.error("Error fetching note title:", error);
      }
    };

    createNoteIfNew();
  }, []);

  useEffect(() => {
    const insertBlockIdIfNeeded = async () => {
      try {
        if (blockIndexForNewBlockId !== undefined) {
          const targetNoteContent = (await db.notes.get(targetNoteId))?.content;
          const parser = new DOMParser();
          const document = parser.parseFromString(
            targetNoteContent || "",
            "text/html",
          );
          const targetBlock = Array.from(document.body.children)[
            blockIndexForNewBlockId
          ];

          const blockIdElement = document.createElement("span");
          blockIdElement.className = "block-id";
          blockIdElement.id = targetBlockId;
          blockIdElement.textContent = `::${targetBlockId}`;

          targetBlock.appendChild(document.createTextNode(" "));
          targetBlock.appendChild(blockIdElement);

          await db.notes.update(targetNoteId, {
            content: document.body.innerHTML,
          });

          await authFetch(
            `/api/notes/${targetNoteId}`,
            {
              credentials: "include",
              method: "POST",
              headers: {
                "Content-Type": "application/json", // specify JSON content type for below
              },
              body: JSON.stringify({ updatedContent: document.body.innerHTML }),
            }, // include cookies with request; required for cookie session to function
          );

          // immediately remove blockIndexForNewBlockId after using it
          updateAttributes({
            blockIndexForNewBlockId: undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching note title:", error);
      }
    };

    insertBlockIdIfNeeded();
  }, []);

  return (
    <NodeViewWrapper
      as="span"
      // only display id if current node is a tag; used to target a block in a backlink
      id={node.attrs.type === "tag" ? node.attrs.id : ""}
      className={`${node.attrs.type} ${!note ? "text-blue-100" : ""}`}
    >
      {!note ? (
        <>Cannot find note with id "{targetNoteId}"</>
      ) : (
        <HashLink
          to={`/app/notes/${targetNoteId}${targetBlockId ? `#${targetBlockId}` : ""}`}
        >
          {suggestionChar === "[["
            ? `${suggestionChar}${note.title}${targetBlockId ? `::${targetBlockId}` : ""}]]`
            : `${suggestionChar}${note.title}`}
        </HashLink>
      )}
    </NodeViewWrapper>
  );
};

export default NotelinkNodeView;
