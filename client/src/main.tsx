// import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { SessionProvider } from "./contexts/SessionContext";
import { SSEProvider } from "./contexts/SSEContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <LoadingProvider>
        <SSEProvider>
          <SessionProvider>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
              <App />
            </GoogleOAuthProvider>
          </SessionProvider>
        </SSEProvider>
      </LoadingProvider>
    </AuthProvider>
  </BrowserRouter>,
);
