import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { TiptapCollabProvider } from "@hocuspocus/provider";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { HashLink } from "react-router-hash-link";
import * as Y from "yjs";
import { db } from "../db";
import { useAuth } from "../contexts/AuthContext";

const NotelinkNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const { currentUser } = useAuth();
  const suggestionChar = node.attrs.type === "notelink" ? "[[" : "#";
  const {
    targetNoteId,
    targetBlockId,
    blockIndexForNewBlockId,
  } = node.attrs;
  const note = useLiveQuery(() => db.notes.get(targetNoteId), [targetNoteId]);

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

          //

          const yDoc = new Y.Doc();
          const tempCollabProvider = new TiptapCollabProvider({
            name: `${currentUser}/${targetNoteId}`,
            baseUrl: "ws://127.0.0.1:1234",
            token: "notoken",
            document: yDoc,

            onConnect() {
              tempCollabProvider.sendStateless(JSON.stringify({
                type: "setTempProvider"
              }));
            },
            onSynced() {
              const xmlFragment = yDoc.getXmlFragment("default");
              const targetElement = (xmlFragment.toArray()[blockIndexForNewBlockId]) as Y.XmlElement;
              // console.log(xmlFragment.toArray(), blockIndexForNewBlockId);

              const span = new Y.XmlElement("blockId");
              span.setAttribute("id", targetBlockId);

              targetElement.insert(targetElement.length, [span]);
            },
            onStateless({ payload }) {
              const msg = JSON.parse(payload);

              if (msg.type === "destroyTempProvider") {
                tempCollabProvider.destroy();
                yDoc.destroy();
              }
            }
          });

          // immediately remove blockIndexForNewBlockId after using it
          setTimeout(() => {
            updateAttributes({ blockIndexForNewBlockId: undefined });
          }, 0);
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
