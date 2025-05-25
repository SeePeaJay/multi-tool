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
  contentWords?: string[];
}

const db = new Dexie("AppDatabase") as Dexie & {
  notes: EntityTable<Note, "id">;
};

// Schema declaration: define primary key (id) and indexed props to enable faster querying when they're used
db.version(1).stores({
  notes: "id, &title, *contentWords",
});

const turndownService = new TurndownService();

turndownService.escape = function (string: string) {
  return string; // prevents escaping potential Markdown syntax like `[` or `]`
};

db.notes.hook("creating", function (primKey, obj) {
  obj.contentWords = [""];
});

db.notes.hook("updating", function (mods: Partial<Note>) {
  if (mods.content) {
    const markdown = turndownService.turndown(mods.content);
    const words = markdown.split(/\s+/);

    return { contentWords: words };
  }
});

export { db };
