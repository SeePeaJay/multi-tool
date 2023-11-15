import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { nanoid } from "nanoid";

interface RowWithCount {
  count: number;
}
interface Block {
  id: string;
  repo_id: string;
  engram_id: string;
  order_number: number;
  content: string;
}

const location = process.env.SQLITE_DB_LOCATION || "db/test.db";
let db: sqlite3.Database;

function getDefaultBlocks() {
  try {
    const html = fs.readFileSync(path.resolve(__dirname, "../../persistence/multi-tool.html"), "utf8");
    const dom = new JSDOM(html);
    const body = dom.window.document.body;
    const htmlElements = Array.from(body.children).map((child: Element) => child.outerHTML);
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

export function init(): Promise<void> {
  /* Create directory if missing */
  const dirName = path.dirname(location);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  /* Create table and rows if missing */
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
              const defaultBlocks = getDefaultBlocks();

              db.serialize(() => {
                const statement = db.prepare(
                  "INSERT INTO blocks (id, repo_id, engram_id, order_number, content) VALUES (?, ?, ?, ?, ?)",
                );

                defaultBlocks.forEach((block) => {
                  statement.run(block, function (err) {
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

export function getItems(): Promise<Block[]> {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM blocks", function (err, rows: Block[]) {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

export default {
  init,
  getItems,
};
