import InitialLoadingScreen from "../components/InitialLoadingScreen";
import Editor from "../components/Editor";
import { useStatelessMessenger } from "../contexts/StatelessMessengerContext";

function Starred() {
  const { starredId } = useStatelessMessenger();

  return (
    <>
      {starredId ? (
        <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
          <Editor noteId={starredId}/>
        </div>
      ) : (
        <InitialLoadingScreen />
      )}
    </>
  );
}

export default Starred;
