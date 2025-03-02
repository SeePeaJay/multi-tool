import { useLoading } from "../contexts/LoadingContext";
import SkeletonEditor from "./SkeletonEditor";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";
import "./Editor.css";

interface EditorProps {
  initialNoteContent: string;
}

const Editor = ({ initialNoteContent }: EditorProps) => {
  const { isLoading } = useLoading();

  return (
    <>
      {isLoading && !initialNoteContent ? ( // this isLoading check ensures the editors are only rendered after all the props are ready
        <SkeletonEditor />
      ) : (
        <>
          <TitleEditor />
          <ContentEditor initialNoteContent={initialNoteContent} />
        </>
      )}
    </>
  );
};

export default Editor;
