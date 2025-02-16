import { useLoading } from "../contexts/LoadingContext";
import SkeletonEditor from "./SkeletonEditor";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";
import "./Editor.css";

const Editor = () => {
  const { isLoading } = useLoading();

  return (
    <>
      {isLoading ? ( // this isLoading check ensures the editors are only rendered after all the props are ready
        <SkeletonEditor />
      ) : (
        <>
          <TitleEditor />
          <ContentEditor />
        </>
      )}
    </>
  );
};

export default Editor;
