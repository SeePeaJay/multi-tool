import { useParams } from "react-router-dom";
import Editor from "../components/Editor";
import InitialLoadingScreen from "../components/InitialLoadingScreen";
import { useCollabResources } from "../contexts/CollabResourcesContext";

function Note() {
  const { noteId: noteIdParam } = useParams();
  const { starredAndMetadataAreReady } = useCollabResources();

  const noteId = noteIdParam || "starred";

  return (
    <>
      {starredAndMetadataAreReady ? (
        <div className="page-container">
          {/* Using a key is the only reliable way to force the editor to remount when noteId changes. We remount to initialize the content editor with a new ydoc */}
          <Editor key={noteId} noteId={noteId} />{" "}
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Note;
