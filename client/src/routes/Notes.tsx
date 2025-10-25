import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { HashLink } from "react-router-hash-link";
import { db } from "../db";

function Notes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const notes = useLiveQuery(() => {
    const filteredNotes = db.notes.filter((note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (sortOrder === "desc") {
      return filteredNotes.reverse().sortBy("title");
    }

    return filteredNotes.sortBy("title");
  }, [searchTerm, sortOrder]);

  const sortByTitle = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSortOrder);
  };

  return (
    <div className="page-container">
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
            <th onClick={sortByTitle} className="cursor-pointer">
              Title {sortOrder === "asc" ? "▲" : "▼"}
            </th>
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
