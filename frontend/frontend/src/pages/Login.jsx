// src/components/LoginBox.jsx
import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      const response = await api.post("/login/", { email, password });
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      navigate("/dashboard");
    } catch (error) {
      if (error.response?.status === 401) {
        alert("Invalid email or password.");
      } else {
        alert("Something went wrong. Try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <header className="bg-blue-900 text-white text-center py-4 w-full shadow-md">
        <h1 className="text-2xl font-bold">TalentMatch AI</h1>
        <p className="text-sm mt-1">AI-powered candidate shortlisting made simple</p>
      </header>
    <div className="bg-white rounded-lg shadow-lg p-8 my-12">
      <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">
        Login
      </h2>

      <form className="flex flex-col gap-4" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="mt-4 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex justify-center items-center gap-2"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
    </div>
  );
}
