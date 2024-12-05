import { useLoading } from "../contexts/LoadingContext";
import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";

interface EditorProps {
  noteId: string;
  initialTitleEditorContent: string;
  initialContentEditorContent: string;
}

const Editor = ({ noteId, initialTitleEditorContent, initialContentEditorContent }: EditorProps) => {
  const { isLoading } = useLoading();

  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <>
      {isLoading ? (
        <SkeletonEditor />
      ) : (
        <>
          <TitleEditor noteId={noteId} initialEditorContent={initialTitleEditorContent} />
          <ContentEditor noteId={noteId} initialEditorContent={initialContentEditorContent} />
        </>
      )}
    </>
  );
};

export default Editor;
