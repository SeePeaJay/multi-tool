import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Root() {
  const location = useLocation();
  const navigate = useNavigate();

  const OAuthCallback = async () => {
    const query = new URLSearchParams(location.search);
    const code = query.get("code");

    if (code) {
      // Exchange the authorization code for an access token here
      const response = await fetch(
        `http://localhost:3000/api/auth?code=${code}`,
      );
      console.log(response);

      // After processing the code, redirect to clean up the URL
      navigate(location.pathname, { replace: true });
    }
  };

  useEffect(() => {
    OAuthCallback();
  }, [location]);

  return (
    <div className="mx-auto w-[90vw] p-8 lg:w-[50vw]">
      <h1>Multi-Tool</h1>
      <p>Multi-Tool is an experimental block-based note-taking application.</p>
    </div>
  );
}

export default Root;
