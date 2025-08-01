import { useParams } from "react-router-dom";
import Editor from "../components/Editor";
import InitialLoadingScreen from "../components/InitialLoadingScreen";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";

function Note() {
  const { noteId: noteIdParam } = useParams();
  const { starredId } = useStatelessMessenger();

  return (
    <>
      {starredId ? (
        <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
          <Editor key={noteIdParam!} noteId={noteIdParam!} />{" "}
          {/* Note route must have a param; key forces remount when param changes */}
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Note;
