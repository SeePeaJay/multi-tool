import { useParams } from "react-router-dom";
import Editor from "../components/Editor";

function Note() {
  const { noteId: noteIdParam } = useParams();

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      <Editor key={noteIdParam!} noteId={noteIdParam!} />{" "}
      {/* Note route must have a param; key forces remount when param changes */}
    </div>
  );
}

export default Note;
