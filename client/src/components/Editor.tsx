import { useLoading } from "../contexts/LoadingContext";
import SkeletonEditor from "./SkeletonEditor";
import "./Editor.css";
import TitleEditor from "./TitleEditor";
import ContentEditor from "./ContentEditor";

interface EditorProps {
  title: string;
  content: string;
}

const Editor = ({ title, content }: EditorProps) => {
  const { isLoading } = useLoading();

  // Tiptap's content prop is static, so only render element when content is ready
  return (
    <>
      {isLoading ? (
        <SkeletonEditor />
      ) : (
        <>
          <TitleEditor title={title} />
          <ContentEditor title={title} content={content} />
        </>
      )}
    </>
  );
};

export default Editor;
