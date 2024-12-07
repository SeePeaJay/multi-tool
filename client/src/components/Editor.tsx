import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";

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
  return (
    <>
      {noteId ? ( // this noteId check ensures the editors are only rendered after all the props are ready
        <>
          <TitleEditor
            noteId={noteId}
            initialEditorContent={initialTitleEditorContent}
          />
          <ContentEditor
            noteId={noteId}
            initialEditorContent={initialContentEditorContent}
          />
        </>
      ) : (
        <SkeletonEditor />
      )}
    </>
  );
};

export default Editor;
