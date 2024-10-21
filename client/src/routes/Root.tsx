import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Root() {
  const location = useLocation();
  const navigate = useNavigate();

  const OAuthCallback = async () => {
    const query = new URLSearchParams(location.search);
    const code = query.get("code");

    if (code) {
      // exchange auth code for access token
      const response = await fetch(
        `http://localhost:3000/api/auth?code=${code}`,
        { credentials: "include" }, // include cookies with request; required for cookie session to function
      );
      console.log(response);

      // redirect to clean up query string in URL
      navigate(location.pathname, { replace: true });

      const response2 = await fetch(
        `http://localhost:3000/api/user`,
        { credentials: "include" }, // include cookies with request; required for cookie session to function
      );
      console.log(response2);
    }
  };

  useEffect(() => {
    OAuthCallback();
  }, []);

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      <h1>Multi-Tool</h1>
      <p>Multi-Tool is an experimental block-based note-taking application.</p>
    </div>
  );
}

export default Root;
