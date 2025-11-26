import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access");

  // If no token, redirect to login page
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, allow access
  return children;
}
