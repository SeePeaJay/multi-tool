import { nanoid } from "nanoid";
import { JSDOM } from "jsdom";
import sqlite3 from "sqlite3";

let db: sqlite3.Database;

function createBlockLink({
  linkLocation,
  linkTarget,
  isTargetBlock,
}: {
  linkLocation: string | null | undefined;
  linkTarget: string;
  isTargetBlock: boolean;
}) {
  const blockId = nanoid(8);
  const blockLinkToCreate = `<p id="${blockId}"><engram-link ${
    isTargetBlock ? 'isanchor="true"' : ""
  } targetid="${linkTarget}"></engram-link></p>`;

  db.run(
    `
          INSERT INTO blocks (id, engram_id, order_number, content)
          SELECT ?, ?, (SELECT IFNULL(MAX(order_number) + 1, 0) FROM blocks WHERE engram_id = ?), ?
          WHERE NOT EXISTS (
            SELECT 1 FROM blocks WHERE engram_id = ? AND content = ?
          );
        `,
    [blockId, linkLocation, linkLocation, blockLinkToCreate, linkLocation, blockLinkToCreate],
  );
}

function createTag({
  tagLocation,
  isLocationBlock,
  tagTarget,
}: {
  tagLocation: string | null | undefined;
  isLocationBlock: boolean;
  tagTarget: string;
}) {
  const tableName = isLocationBlock ? "blocks" : "engrams";
  const columnName = isLocationBlock ? "content" : "title";
  const tagToCreate = `<engram-link istag="true" targetid="${tagTarget}"></engram-link>`;

  if (tableName === "blocks") {
    db.get(`SELECT content FROM blocks WHERE id = ?`, [tagLocation], function (err, row: { content: string }) {
      if (err) {
        return console.error(err.message);
      }

      const dom = new JSDOM(row.content);
      const element = dom.window.document.body.firstElementChild;
      const engramLinkElement = dom.window.document.createElement("engram-link");
      engramLinkElement.setAttribute("istag", "true");
      engramLinkElement.setAttribute("targetid", tagTarget);
      element?.appendChild(engramLinkElement);

      const updatedContent = element?.outerHTML;
      console.log(updatedContent);

      db.run(
        `UPDATE blocks SET content = ? WHERE id = ? AND content NOT LIKE ?`,
        [updatedContent, tagLocation, `%${tagToCreate}%`],
        function (err) {
          if (err) {
            return console.error(err.message);
          }
        },
      );
    });
  } else {
    db.run(
      `UPDATE ${tableName} SET ${columnName} = ${columnName} || ? WHERE id = ? AND ${columnName} NOT LIKE ?`,
      [tagToCreate, tagLocation, `%${tagToCreate}%`],
      function (err) {
        if (err) {
          return console.error(err.message);
        }
      },
    );
  }
}

function deleteBlockLink({
  linkLocation,
  linkTarget,
}: {
  linkLocation: string | null | undefined;
  linkTarget: string;
}) {
  const blockLinksToDelete = [
    `<engram-link isanchor="true" targetid="${linkTarget}"></engram-link>`,
    `<engram-link targetid="${linkTarget}"></engram-link>`,
  ];

  blockLinksToDelete.forEach((link) => {
    db.run(`DELETE FROM blocks WHERE engram_id = ? AND content LIKE ?`, [linkLocation, `%${link}%`]);
  });
}

function deleteTag({
  tagLocation,
  isLocationBlock,
  tagTarget,
}: {
  tagLocation: string | null | undefined;
  isLocationBlock: boolean;
  tagTarget: string;
}) {
  const tagToDelete = `<engram-link istag="true" targetid="${tagTarget}"></engram-link>`;
  const tableName = isLocationBlock ? "blocks" : "engrams";
  const columnName = isLocationBlock ? "content" : "title";
  console.log(tagLocation);

  db.run(`UPDATE ${tableName} SET ${columnName} = REPLACE(${columnName}, ?, '') WHERE id = ?`, [
    tagToDelete,
    tagLocation,
  ]);
}

function createBacklinks({
  origin,
  originEngramId,
  createdLinks,
}: {
  origin: string;
  originEngramId: string;
  createdLinks: string[];
}) {
  createdLinks.forEach((createdLinkString) => {
    const dom = new JSDOM(createdLinkString);
    const createdLink = dom.window.document.body.firstElementChild;
    const createdLinkTarget = createdLink?.getAttribute("targetid");

    if (createdLink?.hasAttribute("istag")) {
      createBlockLink({
        linkLocation: createdLinkTarget,
        linkTarget: origin,
        isTargetBlock: origin !== originEngramId,
      });
    } else {
      createTag({
        tagLocation: createdLinkTarget,
        isLocationBlock: createdLink?.hasAttribute("isanchor") || false,
        tagTarget: originEngramId,
      });
    }
  });
}

function deleteBacklinks({
  origin,
  originEngramId,
  deletedLinks,
}: {
  origin: string;
  originEngramId: string;
  deletedLinks: string[];
}) {
  deletedLinks.forEach((deletedLinkString) => {
    const dom = new JSDOM(deletedLinkString);
    const deletedLink = dom.window.document.body.firstElementChild;
    const deletedLinkTarget = deletedLink?.getAttribute("targetid");

    console.log(deletedLinkTarget);

    if (deletedLink?.hasAttribute("istag")) {
      deleteBlockLink({ linkLocation: deletedLinkTarget, linkTarget: origin });
    } else {
      deleteTag({
        tagLocation: deletedLinkTarget,
        isLocationBlock: deletedLink?.hasAttribute("isanchor") || false,
        tagTarget: originEngramId,
      });
    }
  });
}

export default function modifyBacklinks({
  origin, // modifiedLinkOrigin
  originEngramId,
  dbVariable,
  createdLinks,
  deletedLinks,
}: {
  origin: string;
  originEngramId: string;
  dbVariable: sqlite3.Database;
  createdLinks: string[];
  deletedLinks: string[];
}) {
  db = dbVariable;

  db.serialize(() => {
    createBacklinks({ origin, originEngramId, createdLinks });
    deleteBacklinks({ origin, originEngramId, deletedLinks });
  });
}
