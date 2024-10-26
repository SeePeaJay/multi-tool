// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import SessionChecker from "./components/SessionChecker";
import Navbar from "./components/Navbar";
import Root from "./routes/Root";
import App from "./routes/App";
import Notes from "./routes/Notes";
import ProtectedRoute from "./routes/ProtectedRoute";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BrowserRouter>
      <SessionChecker />
      <Navbar />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/app" element={<App />} />
        <Route
          path="/app/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </AuthProvider>,
);
