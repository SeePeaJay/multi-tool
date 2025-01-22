import { useEffect } from "react";
import { useParams } from "react-router-dom";
// import { HashLink } from "react-router-hash-link";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { db } from "../db";
import { useSSE } from "../contexts/SSEContext";
import { useAuthFetch } from "../hooks/AuthFetch";

const BacklinksNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const authFetch = useAuthFetch();
  const { noteId: noteIdParam } = useParams();
  const { rerenderTrigger } = useSSE();

  useEffect(() => {
    const getBacklinksOwnerId = async () => {
      if (noteIdParam) {
        return noteIdParam; // you are in the Note route, which should have an ID at this point
      }

      const starred = await db.table("notes").get({ title: "Starred" });
      return starred?.id || null; // initial load when "Starred" hasn't been fetched yet
    };

    const updateBacklinks = async () => {
      const backlinksOwnerId = await getBacklinksOwnerId();

      // if "Starred" hasn't been fetched yet, immediately exit
      if (!backlinksOwnerId) {
        return;
      }

      const cachedNote = await db.table("notes").get(backlinksOwnerId);
      // console.log(cachedNote);

      if (!cachedNote.hasFetchedBacklinks) {
        // fetch notes that tag current note
        const response = await authFetch(`/api/search`, {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: `#${backlinksOwnerId}` }), // `frontmatter`
        });

        // update Dexie
        await Promise.all(
          response.map((note: { id: string; name: string; content: string }) =>
            db.notes.update(note.id, {
              content: note.content,
            }),
          ),
        );
        await db.notes.update(backlinksOwnerId, {
          hasFetchedBacklinks: true,
        });
      }

      // search for backlinks
      const result = await db.notes
        .where("contentWords")
        .anyOf(`#${backlinksOwnerId}`)
        .distinct()
        .toArray();
      console.log(result);

      // update node
      const backlinks: {
        [key: string]: string[];
      } = {};
      const parser = new DOMParser();
      result.forEach((note) => {
        const doc = parser.parseFromString(note.content, "text/html");
        const targetSpans = doc.querySelectorAll(
          `span.tag[data-type="tag"][data-target-note-id="${backlinksOwnerId}"]`,
        );
        const parentElements = Array.from(targetSpans)
          .filter(
            (span) => !span.parentElement?.classList.contains("frontmatter"),
          )
          .map((span) => span.parentElement!.id);

        backlinks[note.id] = parentElements;
      });

      console.log(backlinks);
    };

    updateBacklinks();
  }, [rerenderTrigger]);

  return <NodeViewWrapper as="div" className={`backlinks`}></NodeViewWrapper>;
};

export default BacklinksNodeView;
