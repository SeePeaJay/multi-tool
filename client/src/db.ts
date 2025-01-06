/*
 * A file that centralizes all database-related logic for dexie.
 */

import Dexie, { type EntityTable } from "dexie";

export interface Note {
  id: string;
  title: string;
  content: string;
}

const db = new Dexie("AppDatabase") as Dexie & {
  notes: EntityTable<Note, "id">;
};

// Schema declaration:
db.version(1).stores({
  notes: "id, &title",
});

export { db };
