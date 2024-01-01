import { nanoid } from "nanoid";
import { JSDOM } from "jsdom";
import sqlite3 from "sqlite3";

let db: sqlite3.Database;

function createBlockLink({
  linkLocation,
  linkTarget,
  targetEngramId,
}: {
  linkLocation: string | null | undefined;
  linkTarget: string;
  targetEngramId: string;
}) {
  const blockId = nanoid(8);
  const blockLinkToCreate = `<p id="${blockId}"><engram-link targetid="${linkTarget}" targettitleid="${targetEngramId}"></engram-link></p>`;

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
  const tagToCreate = `<engram-link istag="true" targetid="${tagTarget}" targettitleid="${tagTarget}"></engram-link>`;

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
  targetEngramId,
}: {
  linkLocation: string | null | undefined;
  linkTarget: string;
  targetEngramId: string;
}) {
  const blockLinkToDelete = `<engram-link targetid="${linkTarget}" targettitleid="${targetEngramId}"></engram-link>`;

  db.run(`DELETE FROM blocks WHERE engram_id = ? AND content LIKE ?`, [linkLocation, `%${blockLinkToDelete}%`]);
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
  const tagToDelete = `<engram-link istag="true" targetid="${tagTarget}" targettitleid="${tagTarget}"></engram-link>`;
  const tableName = isLocationBlock ? "blocks" : "engrams";
  const columnName = isLocationBlock ? "content" : "title";

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
        targetEngramId: originEngramId,
      });
    } else {
      createTag({
        tagLocation: createdLinkTarget,
        isLocationBlock: createdLink?.getAttribute("targetid") !== createdLink?.getAttribute("targettitleid") || false,
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

    if (deletedLink?.hasAttribute("istag")) {
      deleteBlockLink({ linkLocation: deletedLinkTarget, linkTarget: origin, targetEngramId: originEngramId });
    } else {
      deleteTag({
        tagLocation: deletedLinkTarget,
        isLocationBlock: deletedLink?.getAttribute("targetid") !== deletedLink?.getAttribute("targettitleid") || false,
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
