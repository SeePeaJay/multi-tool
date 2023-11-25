import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { nanoid } from "nanoid";

interface RowWithCount {
  count: number;
}
interface BlockRow {
  id: string;
  repo_id: string;
  engram_id: string;
  order_number: number;
  content: string;
}

const location = process.env.SQLITE_DB_LOCATION || "db/test.db";
let db: sqlite3.Database;

function getDefaultBlockRows() {
  try {
    const html = fs.readFileSync(path.resolve(__dirname, "./multi-tool.html"), "utf8");
    const dom = new JSDOM(html);
    const htmlElements = Array.from(dom.window.document.body.children).map((child: Element) => child.outerHTML);
    const engramId = nanoid(8);

    return htmlElements.map((htmlElement, index) => {
      const blockId = index === 0 ? engramId : nanoid(8);

      const dom = new JSDOM(htmlElement);
      const targetElement = dom.window.document.body.firstElementChild;
      if (targetElement) {
        targetElement.id = blockId;
      }

      return [blockId, null, engramId, index, targetElement?.outerHTML || htmlElement];
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

function getTitleFromHtml(html: string) {
  const dom = new JSDOM(html);
  return dom.window.document.body.firstElementChild?.textContent || html;
}

export function init(): Promise<void> {
  /* Create directory if missing */
  const dirName = path.dirname(location);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  /* Create blocks table and default rows if missing */
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(location, (err) => {
      if (err) return reject(err);

      db.run(
        "CREATE TABLE IF NOT EXISTS blocks (id TEXT(8) NOT NULL, repo_id TEXT(8), engram_id TEXT(8) NOT NULL, order_number INTEGER NOT NULL, content TEXT NOT NULL)",
        (err) => {
          if (err) return reject(err);

          db.get("SELECT COUNT(*) as count FROM blocks", (err, row: RowWithCount) => {
            if (err) return reject(err);

            if (row.count === 0) {
              const defaultBlockRows = getDefaultBlockRows();

              db.serialize(() => {
                const statement = db.prepare(
                  "INSERT INTO blocks (id, repo_id, engram_id, order_number, content) VALUES (?, ?, ?, ?, ?)",
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

export function getBlockRows(engramId?: string): Promise<BlockRow[]> {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM blocks";
    const params = [];

    if (engramId) {
      query += " WHERE engram_id = ?";
      params.push(engramId);
    } else {
      query += " WHERE repo_id IS NULL";
    }

    db.all(query, params, (err, rows: BlockRow[]) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

export function getEngramIdsAndTitles(userId: string): Promise<object[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, content FROM blocks WHERE repo_id = ? AND order_number = 0`,
      [userId],
      (err, rows: BlockRow[]) => {
        if (err) {
          return reject(err);
        }

        const engramIdsAndTitles = rows.map((row) => ({
          title: getTitleFromHtml(row.content),
          id: row.id,
        }));

        resolve(engramIdsAndTitles);
      },
    );
  });
}

export function createStarredEngram(userId: string) {
  const blockId = nanoid(8);
  const content = `<h1 id="${blockId}">Starred</h1>`;
  const row = [blockId, userId, blockId, 0, content];

  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO blocks (id, repo_id, engram_id, order_number, content) VALUES (?, ?, ?, ?, ?)`, row, (err) => {
      if (err) {
        return reject(err);
      }

      resolve(getTitleFromHtml(content));
    });
  });
}

export default {
  init,
  getBlockRows,
  getEngramIdsAndTitles,
  createStarredEngram,
};
