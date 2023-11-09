import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

interface TodoItem {
  id: string;
  name: string;
  completed: boolean;
}
interface Row {
  count: number;
}

const location = process.env.SQLITE_DB_LOCATION || "db/test.db";
let db: sqlite3.Database;

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

      if (process.env.NODE_ENV !== "test") {
        console.log(`Using sqlite database at ${location}`);
      }

      db.run("CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)", (err) => {
        if (err) return reject(err);

        db.get("SELECT COUNT(*) as count FROM todo_items", (err, row: Row) => {
          if (err) return reject(err);

          if (row.count === 0) {
            db.run(
              `INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)`,
              ["1", "Task a", false],
              function (err) {
                if (err) {
                  return console.error(err.message);
                }

                console.log(`Rows inserted ${this.changes}`);
              },
            );
          }

          resolve();
        });
      });
    });
  });
}

export function getItems(): Promise<TodoItem[]> {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM todo_items", function (err, rows: TodoItem[]) {
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
