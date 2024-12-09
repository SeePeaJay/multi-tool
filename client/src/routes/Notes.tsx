import { useEffect } from "react";
import { useAuthFetch } from "../hooks/AuthFetch";

function Notes() {
  const authFetch = useAuthFetch();

  const fetchNotes = async () => {
    const response = await authFetch(
      `/api/notes`,
      { credentials: "include" }, // include cookies with request; required for cookie session to function
    );

    console.log(response);
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
