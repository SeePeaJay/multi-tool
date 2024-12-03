import { useLoading } from "../contexts/LoadingContext";
import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";

interface EditorProps {
  noteId: string;
  title: string;
  content: string;
}

const Editor = ({ noteId, title, content }: EditorProps) => {
  const { isLoading } = useLoading();

  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <>
      {isLoading ? (
        <SkeletonEditor />
      ) : (
        <>
          <TitleEditor title={title} />
          <ContentEditor noteId={noteId} title={title} content={content} />
        </>
      )}
    </>
  );
};

export default Editor;
