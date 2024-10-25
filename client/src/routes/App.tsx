import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAuthenticated } = useAuth();

  const checkAuthStatus = async () => {
    const query = new URLSearchParams(location.search);
    const code = query.get("code");

    if (code) {
      // exchange auth code for access token
      const response = await fetch(
        `http://localhost:3000/api/auth?code=${code}`,
        { credentials: "include" }, // include cookies with request; required for cookie session to function
      );
      console.log(response);

      if (response.ok) {
        setIsAuthenticated(true);
      }

      // redirect to clean up query string in URL
      navigate(location.pathname, { replace: true });
    }
  };

  const testResponse = async () => {
    const response2 = await fetch(
      `http://localhost:3000/api/user`,
      { credentials: "include" }, // include cookies with request; required for cookie session to function
    );

    console.log(response2);
  }

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <div className="mx-auto p-8 w-[90vw] lg:w-[50vw]">
      <h1>App</h1>
      <button onClick={testResponse}>Test API</button>
    </div>
  );
}

export default App;