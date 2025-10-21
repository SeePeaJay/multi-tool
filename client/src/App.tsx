import { GoogleOAuthProvider } from "@react-oauth/google";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import Navbar from "./components/Navbar";
import { SessionProvider } from "./contexts/SessionContext";
import { CollabResourcesProvider } from "./contexts/CollabResourcesContext";
import "react-toastify/dist/ReactToastify.min.css";

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <SessionProvider>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
            <CollabResourcesProvider>
              <>
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
                <Outlet />
              </>
            </CollabResourcesProvider>
          </GoogleOAuthProvider>
        </SessionProvider>
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
