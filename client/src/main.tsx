// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Root from "./routes/Root";
import Notes from "./routes/Notes";
import Starred from "./routes/Starred";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<Root />}></Route>
      <Route path="/notes" element={<Notes />}></Route>
      <Route path="/starred" element={<Starred />}></Route>
    </Routes>
  </BrowserRouter>,
);
