// import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { Routes, Route } from "react-router-dom";
import App from "./App";
import Notes from "./routes/Notes";
import Note from "./routes/Note";
import Root from "./routes/Root";
import Starred from "./routes/Starred";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Root />} />

      <Route element={<App />}>
        <Route path="/app" element={<Starred />} />
        <Route path="/app/notes" element={<Notes />} />
        <Route path="/app/notes/:noteId" element={<Note />} />
      </Route>
    </Routes>
  </BrowserRouter>,
);
