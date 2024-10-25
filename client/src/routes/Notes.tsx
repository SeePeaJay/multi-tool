import { useEffect } from "react";
import { useAuthFetch } from "../hooks/AuthFetch";

function Notes() {
  const authFetch = useAuthFetch();

  const fetchNotes = async () => {
    try {
      const response = await authFetch(
        `http://localhost:3000/api/notes`,
        { credentials: "include" }, // include cookies with request; required for cookie session to function
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      console.log(response);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <div className="mx-auto p-8 w-[90vw] lg:w-[50vw]">
      <h1>All Notes</h1>
    </div>
  );
}

export default Notes;
