/*
 * A file that centralizes all database-related logic for dexie.
 */

import Dexie, { type EntityTable } from "dexie";

const db = new Dexie("AppDatabase") as Dexie & {
  auth: EntityTable<{ key: string; value: boolean }>;
  notes: EntityTable<{ key: string; content: string }>;
};

// Schema declaration:
db.version(1).stores({
  auth: "key",
  notes: "key",
});

export { db };
