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
        <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
          <Editor key={noteId} noteId={noteId} />{" "}
          {/* Using a key is the only reliable way to force the editor to remount when noteId changes. We remount to initialize the content editor with a new ydoc */}
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Note;
