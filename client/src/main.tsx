// import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { SessionProvider } from "./contexts/SessionContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <LoadingProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </LoadingProvider>
    </AuthProvider>
  </BrowserRouter>,
);
