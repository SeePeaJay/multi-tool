import { useLiveQuery } from "dexie-react-hooks";
import isEqual from "lodash.isequal";
import { useEffect } from "react";
import { useParams, NavLink } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { db } from "../db";
import { useAuthFetch } from "../hooks/AuthFetch";

const BacklinksNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const authFetch = useAuthFetch();
  const { noteId: noteIdParam } = useParams();

  const getBacklinksOwnerId = async () => {
    if (noteIdParam) {
      return noteIdParam; // you are in the Note route, which should have an ID at this point
    }

    const starred = await db.table("notes").get({ title: "Starred" });
    return starred?.id || null; // initial load when "Starred" hasn't been fetched yet
  };

  const backlinksWithInnerText = useLiveQuery(async () => {
    const output: Record<
      string,
      {
        title: string;
        backlinkList: Record<string, string>;
      }
    > = {};

    const backlinksOwnerId = await getBacklinksOwnerId();
    const hasFetchedBacklinks = (await db.notes.get(backlinksOwnerId))
      ?.hasFetchedBacklinks;

    // if "Starred" hasn't been fetched yet, or backlinks haven't been fetched yet, then there's no reason to continue
    if (!backlinksOwnerId || !hasFetchedBacklinks) {
      return undefined;
    }

    // query notes containing the keyword
    const notes = await db.notes
      .filter(
        (note) =>
          !!note.contentWords &&
          note.contentWords.includes(`#${backlinksOwnerId}`),
      )
      .toArray();

    notes.forEach((note) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, "text/html");

      const targetSpans = doc.querySelectorAll(
        `span.tag[data-type="tag"][data-target-note-id="${backlinksOwnerId}"]`,
      );

      const parentElements = Array.from(targetSpans)
        .filter(
          (span) => !span.parentElement?.classList.contains("frontmatter"),
        )
        .map((span) => span.parentElement!);

      const backlinksFromNote: Record<string, string> = {};

      parentElements.forEach((element) => {
        backlinksFromNote[element.id] = element.outerHTML;
      });

      // console.log(output[note.id])
      output[note.id] = {
        title: note.title,
        backlinkList: backlinksFromNote,
      };
    });

    console.log(output);
    return output;
  });

  useEffect(() => {
    const backlinks: Record<string, string[]> | null = backlinksWithInnerText
      ? Object.fromEntries(
          Object.entries(backlinksWithInnerText).map(([key, value]) => [
            key,
            Object.keys(value.backlinkList),
          ]),
        )
      : null;

    // update node
    if (
      backlinks && // backlinks can be undefined initially
      node.attrs.backlinks && // it's possible node.attrs.backlinks is empty when switching back to a previous page
      !isEqual(backlinks, node.attrs.backlinks)
    ) {
      updateAttributes({ backlinks });
    }
  }, [backlinksWithInnerText]);

  useEffect(() => {
    const fetchBacklinks = async () => {
      const backlinksOwnerId = await getBacklinksOwnerId();

      // if "Starred" hasn't been fetched yet, immediately exit
      if (!backlinksOwnerId) {
        return;
      }

      const cachedNote = await db.table("notes").get(backlinksOwnerId);

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
          response.map((note: { id: string; content: string }) =>
            db.notes.update(note.id, {
              content: note.content,
            }),
          ),
        );
        await db.notes.update(backlinksOwnerId, {
          hasFetchedBacklinks: true,
        });
      }
    };

    fetchBacklinks();
  }, []);

  return (
    backlinksWithInnerText &&
    Object.keys(backlinksWithInnerText).length > 0 && (
      <NodeViewWrapper as="div" className={`backlinks`}>
        {Object.entries(backlinksWithInnerText).map(([targetId, note]) => (
          <div key={targetId}>
            <NavLink className="backlinkList" to={`/app/notes/${targetId}`}>
              {note.title}
            </NavLink>
            <div>
              {Object.entries(note.backlinkList).map(([blockId, blockText]) => (
                <HashLink
                  key={blockId}
                  className="backlink"
                  to={`/app/notes/${targetId}#${blockId}`}
                  dangerouslySetInnerHTML={{
                    __html:
                      blockText /* this content is already sanitized by the server */,
                  }}
                ></HashLink>
              ))}
            </div>
          </div>
        ))}
      </NodeViewWrapper>
    )
  );
};

export default BacklinksNodeView;
