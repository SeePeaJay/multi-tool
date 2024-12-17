import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { HashLink } from "react-router-hash-link";
import { db } from "../db";

function Notes() {
  const notes = useLiveQuery(() => db.notes.toArray(), []);

  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      <h1>All Notes</h1>

      <input
        type="text"
        placeholder="Search notes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input input-sm input-bordered mb-2 w-full"
      />

      <table className="table table-sm">
        <thead>
          <tr>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {notes &&
            notes.map((note) => (
              <tr key={note.id}>
                <td>
                  <HashLink
                    className="text-blue-600 hover:underline"
                    to={`/app/notes/${note.id}`}
                  >
                    {note.title}
                  </HashLink>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default Notes;
