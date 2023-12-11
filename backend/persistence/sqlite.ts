import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { nanoid } from "nanoid";

interface BlockRow {
  id: string;
  engram_id: string;
  order_number: number;
  content: string;
}
interface GetBlockRowsOptions {
  repoId?: string;
  engramTitle: string;
}
interface CreateEngramOptions {
  repoId: string;
  engramTitle: string;
}
interface UpdateEngramTitleOptions {
  repoId: string;
  oldEngramTitle: string;
  newEngramTitle: string;
}
interface BlockUpdate {
  orderNumber: number;
  content: string;
}
type UpdatedBlocks = {
  [id: string]: BlockUpdate | null;
};

const location = process.env.SQLITE_DB_LOCATION || "db/test.db";
let db: sqlite3.Database;

function getDefaultRows() {
  try {
    const html = fs.readFileSync(path.resolve(__dirname, "./multi-tool.html"), "utf8");
    const dom = new JSDOM(html);
    const htmlElements = Array.from(dom.window.document.body.children).map((child: Element) => child.outerHTML);

    const engramId = nanoid(8);
    const defaultRows = [];

    for (let i = 0; i < htmlElements.length; i++) {
      const dom = new JSDOM(htmlElements[i]);
      const targetElement = dom.window.document.body.firstElementChild;

      if (i === 0) {
        defaultRows.push([engramId, targetElement?.textContent || htmlElements[i]]);
      } else {
        const blockId = nanoid(8);

        if (targetElement) {
          targetElement.id = blockId;
        }

        defaultRows.push([blockId, engramId, i, targetElement?.outerHTML || htmlElements[i]]);
      }
    }

    return defaultRows;
  } catch (err) {
    console.error(err);
    return [];
  }
}

function init(): Promise<void> {
  /* Create directory if missing */
  const dirName = path.dirname(location);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  /* Create blocks table and default rows if missing */
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(location, (err) => {
      if (err) return reject(err);

      const defaultRows = getDefaultRows();

      /* Create engrams table and insert default row if it's missing */
      db.run(
        `CREATE TABLE IF NOT EXISTS engrams (id TEXT(8) PRIMARY KEY, repo_id TEXT(8), title TEXT NOT NULL, CONSTRAINT unique_title_per_repo UNIQUE (repo_id, title))`,
        (err) => {
          if (err) {
            return reject(err);
          }

          db.run(
            "INSERT INTO engrams (id, repo_id, title) SELECT ?, NULL, ? WHERE NOT EXISTS(SELECT 1 FROM engrams)",
            defaultRows[0],
            (err) => {
              if (err) {
                return reject(err);
              }
            },
          );
        },
      );

      /* Create blocks table and insert default rows if they're missing */
      db.run(
        "CREATE TABLE IF NOT EXISTS blocks (id TEXT(8) PRIMARY KEY, engram_id TEXT(8) NOT NULL, order_number INTEGER NOT NULL, content TEXT NOT NULL)",
        (err) => {
          if (err) return reject(err);

          db.get("SELECT COUNT(*) as count FROM blocks", (err, row: { count: number }) => {
            if (err) return reject(err);

            if (row.count === 0) {
              const defaultBlockRows = defaultRows.slice(1);

              db.serialize(() => {
                const statement = db.prepare(
                  "INSERT INTO blocks (id, engram_id, order_number, content) VALUES (?, ?, ?, ?)",
                );

                defaultBlockRows.forEach((row) => {
                  statement.run(row, function (err) {
                    if (err) {
                      return console.error(err.message);
                    }
                    console.log(`Row inserted ${this.lastID}`);
                  });
                });
                statement.finalize();
              });
            }

            resolve();
          });
        },
      );
    });
  });
}

function getEngramTitles(repoId: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT title FROM engrams WHERE repo_id = ?`, [repoId], (err, rows: { title: string }[]) => {
      if (err) {
        return reject(err);
      }

      resolve(rows.map((row) => row.title));
    });
  });
}

function getBlockRows(options: GetBlockRowsOptions): Promise<BlockRow[]> {
  return new Promise((resolve, reject) => {
    let query = "SELECT blocks.* FROM blocks INNER JOIN engrams ON blocks.engram_id = engrams.id";
    const params = [];

    if (options.repoId) {
      query += " WHERE engrams.repo_id = ? AND engrams.title = ? ORDER BY order_number";
      params.push(...[options.repoId, options.engramTitle]);
    } else {
      query += " WHERE engrams.repo_id IS NULL AND engrams.title = ? ORDER BY order_number";
      params.push(options.engramTitle);
    }

    db.all(query, params, (err, rows: BlockRow[]) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function renameEngram({ repoId, oldEngramTitle, newEngramTitle }: UpdateEngramTitleOptions) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE engrams SET title = ? WHERE repo_id = ? AND title = ?",
      [newEngramTitle, repoId, oldEngramTitle],
      (err) => {
        if (err) {
          return reject(err);
        }

        resolve(newEngramTitle);
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

function createEngram({ repoId, engramTitle }: CreateEngramOptions): Promise<string> {
  const engramId = nanoid(8);
  const blockId = nanoid(8);
  const engramsRow = [engramId, repoId, engramTitle];
  const blocksRow = [blockId, engramId, 0, `<p id="${blockId}">A sample paragraph originally for ${engramTitle}.`];

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

      resolve(engramTitle);
    });
  });
}

function updateBlocks({
  repoId,
  engramTitle,
  updatedBlocks,
}: {
  repoId: string;
  engramTitle: string;
  updatedBlocks: UpdatedBlocks;
}) {
  getIdFromEngramTitle({
    repoId,
    engramTitle,
  }).then((engramId: string) => {
    db.serialize(() => {
      let counter = 0;
      const totalBlocks = Object.keys(updatedBlocks).length;

      for (const blockId in updatedBlocks) {
        const blockUpdate = updatedBlocks[blockId];

        if (blockUpdate) {
          db.run(
            `UPDATE blocks SET order_number = ?, content = ? WHERE id = ?`,
            [blockUpdate.orderNumber, blockUpdate.content, blockId],
            function (this: { changes: number }, err) {
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

                    counter++;
                    if (counter === totalBlocks) {
                      getAllBlocks(repoId, engramTitle);
                    }
                  },
                );
              } else {
                counter++;
                if (counter === totalBlocks) {
                  getAllBlocks(repoId, engramTitle);
                }
              }
            },
          );
        } else {
          db.run(`DELETE FROM blocks WHERE id = ?`, [blockId], (err) => {
            if (err) {
              throw err;
            }

            counter++;
            if (counter === totalBlocks) {
              getAllBlocks(repoId, engramTitle);
            }
          });
        }
      }
    });
  });
}

function getAllBlocks(repoId: string, engramTitle: string) {
  const query =
    "SELECT blocks.* FROM blocks INNER JOIN engrams ON blocks.engram_id = engrams.id WHERE engrams.repo_id = ? AND engrams.title = ? ORDER BY order_number";
  const params = [repoId, engramTitle];

  db.all(query, params, (err, rows: BlockRow[]) => {
    if (err) {
      throw err;
    }

    console.log(rows);
  });
}

export default {
  init,
  getEngramTitles,
  getBlockRows,
  renameEngram,
  getTitleFromEngramId,
  getIdFromEngramTitle,
  createEngram,
  updateBlocks,
};
