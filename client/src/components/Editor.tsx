import { useLoading } from "../contexts/LoadingContext";
import SkeletonEditor from "./SkeletonEditor";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";
import "./Editor.css";

interface EditorProps {
  noteId: string;
  initialTitleEditorContent: string;
  initialContentEditorContent: string;
}

const Editor = ({
  noteId,
  initialTitleEditorContent,
  initialContentEditorContent,
}: EditorProps) => {
  const { isLoading } = useLoading();

  return (
    <>
      {isLoading ? ( // this isLoading check ensures the editors are only rendered after all the props are ready
        <SkeletonEditor />
      ) : (
        <>
          <TitleEditor
            noteId={noteId}
            initialEditorContent={initialTitleEditorContent} // as for why the initial contents are necessary, check comment on each editor's `content` attr
          />
          <ContentEditor
            noteId={noteId}
            initialEditorContent={initialContentEditorContent}
          />
        </>
      )}
    </>
  );
};

export default Editor;
