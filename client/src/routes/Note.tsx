import { useParams } from "react-router-dom";
import Editor from "../components/Editor";

function Note() {
  const { noteId: noteIdParam } = useParams();

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      <Editor key={window.location.pathname} noteId={noteIdParam!} /> {/* Note route must have a param */}
    </div>
  );
}

export default Note;
