/*
 * A file that centralizes all database-related logic for dexie.
 */

import Dexie, { type EntityTable } from "dexie";
import TurndownService from "turndown";

export interface Note {
  id: string;
  title: string;
  content: string;
  ydocArray: number[];
  contentWords: string[];
}
export interface User {
  id: number;
  metadataYdocArray: number[];
}

const db = new Dexie("AppDatabase") as Dexie & {
  notes: EntityTable<Note, "id">;
  user: EntityTable<User, "id">;
};

// Schema declaration: define primary key (id) and indexed props to enable faster querying when they're used
db.version(1).stores({
  notes: "id, &title, *contentWords",
  user: "id, metadataYdocArray",
});

// Specify markdown converter to prevent escaping potential Markdown syntax like `[` or `]`
const turndownService = new TurndownService();
turndownService.escape = function (string: string) {
  return string;
};

export { db, turndownService };
