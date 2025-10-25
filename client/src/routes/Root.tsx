import { Link } from "react-router-dom";

function Root() {
  return (
    <div className="page-container mt-10 [&>*+*]:mt-2">
      <h1>Multi-Tool</h1>
      <p><Link className="link link-primary" to="/app">Try Live Demo</Link></p>
      <p>Multi-Tool is an experimental block-based note-taking application.</p>
    </div>
  );
}

export default Root;
