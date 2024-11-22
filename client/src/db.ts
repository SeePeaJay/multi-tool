/*
 * A file that centralizes all database-related logic for dexie.
 */

import Dexie, { type EntityTable } from "dexie";

const db = new Dexie("AppDatabase") as Dexie & {
  notes: EntityTable<{ key: string; content: string }>;
};

// Schema declaration:
db.version(1).stores({
  notes: "key",
});

export { db };
