import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { nanoid } from "nanoid";
import modifyBacklinks from "./process-engramlinks-helpers";

interface BlockRow {
  id: string;
  engram_id: string;
  order_number: number;
  content: string;
}
interface GetBlockRowsOptions {
  repoId?: string;
  engramTitle?: string;
  engramId?: string;
}
interface CreateEngramOptions {
  repoId: string;
  engramTitle: string;
}
interface RenameEngramOptions {
  repoId: string;
  engramId: string;
  newEngramTitle: string;
  createdEngramLinks?: string[];
  deletedEngramLinks?: string[];
}
interface BlockUpdate {
  orderNumber?: number;
  content?: string;
  createdEngramLinks?: string[];
  deletedEngramLinks?: string[];
}
type UpdatedBlocks = {
  [id: string]: BlockUpdate;
};

const location = process.env.SQLITE_DB_LOCATION || "db/multi-tool.db";
let db: sqlite3.Database;

function init(): Promise<void> {
  /* Create directory if missing */
  const dirName = path.dirname(path.join(process.env.PWD || "", location));
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  /* Create blocks table and default rows if missing */
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(location, (err) => {
      if (err) return reject(err);

      /* Create engrams table and insert default row if it's missing */
      db.run(
        `CREATE TABLE IF NOT EXISTS engrams (id TEXT(8) PRIMARY KEY, repo_id TEXT(8), title TEXT NOT NULL, CONSTRAINT unique_title_per_repo UNIQUE (repo_id, title))`,
        (err) => {
          if (err) {
            return reject(err);
          }
        },
      );

      /* Create blocks table and insert default rows if they're missing */
      db.run(
        "CREATE TABLE IF NOT EXISTS blocks (id TEXT(8) PRIMARY KEY, engram_id TEXT(8) NOT NULL, order_number INTEGER NOT NULL, content TEXT NOT NULL)",
        (err) => {
          if (err) return reject(err);

          resolve();
        },
      );
    });
  });
}

function getEngramIdsAndTitles(repoId: string): Promise<{ id: string; title: string }[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, title FROM engrams WHERE repo_id = ?`,
      [repoId],
      (err, rows: { id: string; title: string }[]) => {
        if (err) {
          return reject(err);
        }

        resolve(rows);
      },
    );
  });
}

function getBlockRows({ repoId, engramId, engramTitle }: GetBlockRowsOptions): Promise<BlockRow[]> {
  return new Promise((resolve, reject) => {
    let query = "SELECT blocks.* FROM blocks INNER JOIN engrams ON blocks.engram_id = engrams.id";
    const params = [];

    if (repoId) {
      query += ` WHERE engrams.repo_id = ? AND engrams.id = ? ORDER BY order_number`;
      params.push(...[repoId, engramId]);
    } else {
      query += ` WHERE engrams.repo_id IS NULL AND engrams.title = ? ORDER BY order_number`;
      params.push(engramTitle);
    }

    db.all(query, params, (err, rows: BlockRow[]) => {
      if (err) {
        return reject(err);
      }

      resolve(rows);
    });
  });
}

function renameEngram({
  repoId,
  engramId,
  newEngramTitle,
  createdEngramLinks,
  deletedEngramLinks,
}: RenameEngramOptions) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("UPDATE engrams SET title = ? WHERE repo_id = ? AND id = ?", [newEngramTitle, repoId, engramId], (err) => {
        if (err) {
          return reject(err);
        }
      });

      if (createdEngramLinks || deletedEngramLinks) {
        modifyBacklinks({
          origin: engramId,
          originEngramId: engramId,
          dbVariable: db,
          createdLinks: createdEngramLinks || [],
          deletedLinks: deletedEngramLinks || [],
        });
      }

      resolve(newEngramTitle);
    });
  });
}

function getMetadataToDisplayEngramLink({ repoId, targetId }: { repoId: string; targetId: string }) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, title FROM engrams WHERE repo_id = ? AND id = ?`,
      [repoId, targetId],
      (err, row: { id: string; title: string }) => {
        if (err) {
          return reject(err);
        }

        if (!row) {
          db.get(
            `SELECT engrams.title, engrams.id, blocks.content FROM engrams JOIN blocks on engrams.id = blocks.engram_id WHERE engrams.repo_id = ? AND blocks.id = ?`,
            [repoId, targetId],
            (err, row: { id: string; title: string; content: string }) => {
              if (err) {
                return reject(err);
              }

              if (!row) {
                resolve({});
              } else {
                resolve({
                  title: row.title,
                  anchorContent: new JSDOM(row.content).window.document.body.firstElementChild?.innerHTML,
                });
              }
            },
          );
        } else {
          resolve({
            title: row?.title || "",
          });
        }
      },
    );
  });
}

function getTitleFromEngramId({ repoId, engramId }: { repoId: string; engramId: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT title FROM engrams WHERE repo_id = ? AND id = ?`,
      [repoId, engramId],
      (err, row: { title: string }) => {
        if (err) {
          return reject(err);
        }

        resolve(row?.title || "");
      },
    );
  });
}

function getIdFromEngramTitle({ repoId, engramTitle }: { repoId: string; engramTitle: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM engrams WHERE repo_id = ? AND title = ?`,
      [repoId, engramTitle],
      (err, row: { id: string }) => {
        if (err) {
          return reject(err);
        }

        resolve(row?.id || "");
      },
    );
  });
}

function createEngram({ repoId, engramTitle }: CreateEngramOptions): Promise<{ id: string; title: string }> {
  const engramId = nanoid(8);
  const blockId = nanoid(8);
  const engramsRow = [engramId, repoId, engramTitle];
  const blocksRow = [blockId, engramId, 0, `<p id="${blockId}"></p>`];

  return new Promise((resolve, reject) => {
    db.run("INSERT INTO engrams(id, repo_id, title) VALUES (?, ?, ?)", engramsRow, (err) => {
      if (err) {
        return reject(err);
      }
    });

    db.run(`INSERT INTO blocks (id, engram_id, order_number, content) VALUES (?, ?, ?, ?)`, blocksRow, (err) => {
      if (err) {
        return reject(err);
      }

      resolve({ id: engramId, title: engramTitle });
    });
  });
}

function updateBlocks({ engramId, updatedBlocks }: { engramId: string; updatedBlocks: UpdatedBlocks }) {
  db.serialize(() => {
    for (const blockId in updatedBlocks) {
      const blockUpdate = updatedBlocks[blockId];

      if ("orderNumber" in blockUpdate || "content" in blockUpdate) {
        let query = "UPDATE blocks SET ";
        const params = [];

        if ("orderNumber" in blockUpdate) {
          query += "order_number = ?";
          params.push(blockUpdate.orderNumber);
        }
        if ("content" in blockUpdate) {
          query += ("orderNumber" in blockUpdate ? ", " : "") + "content = ?";
          params.push(blockUpdate.content);
        }

        query += " WHERE id = ?";
        params.push(blockId);

        db.run(query, params, function (this: { changes: number }, err) {
          if (err) {
            throw err;
          } else if (this.changes === 0) {
            db.run(
              `INSERT INTO blocks (id, engram_id, order_number, content) VALUES (?, ?, ?, ?);`,
              [blockId, engramId, blockUpdate.orderNumber, blockUpdate.content],
              (err) => {
                if (err) {
                  throw err;
                }
              },
            );
          }
        });

        if ("createdEngramLinks" in blockUpdate || "deletedEngramLinks" in blockUpdate) {
          modifyBacklinks({
            origin: blockId,
            originEngramId: engramId,
            dbVariable: db,
            createdLinks: blockUpdate.createdEngramLinks || [],
            deletedLinks: blockUpdate.deletedEngramLinks || [],
          });
        }
      } else {
        db.run(`DELETE FROM blocks WHERE id = ?`, [blockId], (err) => {
          if (err) {
            throw err;
          }
        });

        if ("deletedEngramLinks" in blockUpdate) {
          modifyBacklinks({
            origin: blockId,
            originEngramId: engramId,
            dbVariable: db,
            createdLinks: [],
            deletedLinks: blockUpdate.deletedEngramLinks || [],
          });
        }
      }
    }
  });
}

function deleteEngram({ repoId, engramId }: { repoId: string; engramId: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `UPDATE blocks SET content = REPLACE(content, '<engram-link targetid="${engramId}"></engram-link>', '') WHERE content LIKE '%<engram-link targetid="${engramId}"></engram-link>%'`,
        function (err) {
          if (err) {
            return reject(err);
          }
        },
      );
      db.run(
        `UPDATE blocks SET content = REPLACE(content, '<engram-link istag="true" targetid="${engramId}"></engram-link>', '') WHERE content LIKE '%<engram-link istag="true" targetid="${engramId}"></engram-link>%'`,
        function (err) {
          if (err) {
            return reject(err);
          }
        },
      );
      db.run(
        `DELETE FROM blocks WHERE engram_id IN (SELECT id FROM engrams WHERE repo_id = ? AND id = ?)`,
        [repoId, engramId],
        (err) => {
          if (err) {
            return reject(err);
          }
        },
      );
      db.run(`DELETE FROM engrams WHERE repo_id = ? AND id = ?`, [repoId, engramId], (err) => {
        if (err) {
          return reject(err);
        }
      });

      resolve();
    });
  });
}

export default {
  init,
  getEngramIdsAndTitles,
  getBlockRows,
  renameEngram,
  getMetadataToDisplayEngramLink,
  getTitleFromEngramId,
  getIdFromEngramTitle,
  createEngram,
  updateBlocks,
  deleteEngram,
};
