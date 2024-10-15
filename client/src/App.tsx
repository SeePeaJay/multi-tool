import Editor from "./components/Editor";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  return (
    <>
      <Navbar />
      <div className="view">
        <Editor />
      </div>
    </>
  );
}

export default App;
