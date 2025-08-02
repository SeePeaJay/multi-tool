import { useParams } from "react-router-dom";
import Editor from "../components/Editor";
import InitialLoadingScreen from "../components/InitialLoadingScreen";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";

function Note() {
  const { noteId: noteIdParam } = useParams();
  const { starredAndMetadataAreReady } = useStatelessMessenger();

  const noteId = noteIdParam || "starred";

  return (
    <>
      {starredAndMetadataAreReady ? (
        <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
          <Editor key={noteId} noteId={noteId} />{" "}
          {/* key forces remount when noteId changes */}
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Note;
