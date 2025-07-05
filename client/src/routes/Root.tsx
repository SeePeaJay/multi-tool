import { Link } from "react-router-dom";

function Root() {
  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw] mt-10 [&>*+*]:mt-2">
      <h1>Multi-Tool</h1>
      <p><Link className="link link-primary" to="/app">Try Live Demo</Link></p>
      <p>Multi-Tool is an experimental block-based note-taking application.</p>
    </div>
  );
}

export default Root;
