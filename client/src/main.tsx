// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './AuthContext';
import Navbar from "./components/Navbar";
import Root from "./routes/Root";
import App from "./routes/App";
import Notes from "./routes/Notes";
import Starred from "./routes/Starred";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Root />}></Route>
        <Route path="/app" element={<App />}></Route>
        <Route path="/app/notes" element={<Notes />}></Route>
        <Route path="/app/starred" element={<Starred />}></Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>,
);
