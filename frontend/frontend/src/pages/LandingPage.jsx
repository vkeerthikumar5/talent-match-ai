import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function LandingPage() {
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
    <div className="min-h-screen relative">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-blue-900 bg-opacity-60 bg-blend-multiply bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/7144251/pexels-photo-7144251.jpeg')",
        }}
      ></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-screen px-8 md:px-20">

        {/* LEFT SECTION */}
        <div className="p-12 md:w-1/2 text-left text-white">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
            TalentMatch AI
          </h1>
          <p className="text-xs md:text-sm lg:text-md max-w-lg text-justify">
            AI-powered candidate shortlisting made simple. Upload resumes, set
            criteria, and find the best candidates instantly.
          </p>

          {/* BUTTONS */}
          <div className="mt-52 md:mt-6 flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">

            {/* Register button always visible */}
            <Link
              to="/register"
              className="inline-flex justify-center items-center py-3 px-6 text-base font-medium text-white rounded-lg bg-blue-700 hover:bg-blue-600 focus:ring-1 focus:ring-blue-300"
            >
              Register
            </Link>

            {/* 🔥 MOBILE LOGIN BUTTON (visible ONLY on mobile) */}
            <Link
              to="/login"
              className="inline-flex justify-center items-center py-3 px-6 text-base font-medium text-blue-100 rounded-lg border border-blue-100 hover:bg-blue-100 hover:text-blue-900 focus:ring-1 focus:ring-blue-300 
              md:hidden"
            >
              Login
            </Link>
          </div>
        </div>

        {/* RIGHT LOGIN FORM (visible ONLY on md and above) */}
        <div className="hidden md:block md:w-1/3 bg-white rounded-lg shadow-lg p-8 mt-10 md:mt-0">
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
    </div>
  );
}
