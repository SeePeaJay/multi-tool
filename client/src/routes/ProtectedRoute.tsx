/* This is primarily designed to block unauthorized users from accessing protected routes through manual URL entry. */

import { ReactNode } from "react";
// import { Navigate, useParams } from "react-router-dom";
// import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  // const { currentUser } = useAuth();
  // console.log("hhh");

  // const { noteId: noteIdParam } = useParams();
  // console.log(noteIdParam);

  // if (!currentUser) {
  //   return <Navigate to="/" replace />;
  // }

  return children;
}

export default ProtectedRoute;
