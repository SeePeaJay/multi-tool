import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import SessionChecker from "../components/SessionChecker";
import Navbar from "../components/Navbar";
import Root from "../routes/Root";
import Starred from "../routes/Starred";
import Notes from "../routes/Notes";
import Note from "../routes/Note";
import ProtectedRoute from "../routes/ProtectedRoute";
import "react-toastify/dist/ReactToastify.min.css";

function App() {
  return (
    <BrowserRouter>
      <SessionChecker />
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
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
        <Route
          path="/app/notes/:noteTitle"
          element={
            <ProtectedRoute>
              <Note />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
