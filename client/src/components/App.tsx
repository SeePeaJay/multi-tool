import { Routes, Route } from "react-router-dom";
import SessionChecker from "../components/SessionChecker";
import Navbar from "../components/Navbar";
import Root from "../routes/Root";
import Starred from "../routes/Starred";
import Notes from "../routes/Notes";
import ProtectedRoute from "../routes/ProtectedRoute";

function App() {
  return (
    <>
      <SessionChecker />
      <Navbar />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/app" element={<Starred />} />
        <Route
          path="/app/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
