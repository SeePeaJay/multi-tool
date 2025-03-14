// import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { SessionProvider } from "./contexts/SessionContext";
import { StatelessMessengerProvider } from "./contexts/StatelessMessengerContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <LoadingProvider>
        <SessionProvider>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
            <StatelessMessengerProvider>
              <App />
            </StatelessMessengerProvider>
          </GoogleOAuthProvider>
        </SessionProvider>
      </LoadingProvider>
    </AuthProvider>
  </BrowserRouter>,
);
